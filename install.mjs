#!/usr/bin/env node
// Instala o actualiza el harness en un proyecto.
//   node install.mjs <proyecto> [--agents claude,codex,cursor,gemini,opencode] [--team] [--force] [--dry-run]
//   node install.mjs doctor <proyecto>
//
// Regla de escritura: el código (.harness/, plugin de OpenCode, cableado de hooks) se actualiza siempre;
// tu texto (AGENTS.md, skills, docs/) no se sobrescribe nunca salvo con --force.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TPL = join(HERE, 'template');
const VERSION = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')).version;
const ALL_AGENTS = ['claude', 'codex', 'cursor', 'gemini', 'opencode'];
const MARK = '.harness/hooks/';
const BLOCK_START = '<!-- harness:start';
const BLOCK_END = '<!-- harness:end -->';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const positional = args.filter((a, i) => !a.startsWith('--') && !['--agents', '--stack'].includes(args[i - 1]));
const STACK_SKILLS = readdirSync(join(TPL, 'skills-stack'));

if (flag('help') || !positional.length) {
  console.log('Uso:\n  node install.mjs <proyecto> [--agents a,b] [--stack a,b] [--team] [--force] [--dry-run]\n  node install.mjs doctor <proyecto>\n\n' +
    `  --agents   lista separada por comas (por defecto: ${ALL_AGENTS.join(',')})\n` +
    `  --stack    skills de tecnología: ${STACK_SKILLS.join(',')} o none (por defecto: se detectan del proyecto)\n` +
    '  --team     protege main y master: el agente no commitea ni hace push ahí\n' +
    '  --force    actualiza también AGENTS.md, skills y docs/ a la versión de la plantilla\n' +
    '  --dry-run  muestra lo que haría sin escribir');
  process.exit(positional.length ? 0 : 1);
}

const runDoctor = (dir) => spawnSync(process.execPath, [join(dir, '.harness', 'doctor.mjs')], { stdio: 'inherit' }).status ?? 1;

if (positional[0] === 'doctor') {
  const dir = resolve(positional[1] || '.');
  if (!existsSync(join(dir, '.harness', 'doctor.mjs'))) { console.error(`${dir} no tiene el harness instalado.`); process.exit(1); }
  process.exit(runDoctor(dir));
}

const target = resolve(positional[0]);
const dry = flag('dry-run');
const force = flag('force');
if (!existsSync(target) || !statSync(target).isDirectory()) { console.error(`No existe el directorio ${target}`); process.exit(1); }
if (target === HERE) { console.error('Este es el repo del harness. Indica el proyecto que quieres equipar.'); process.exit(1); }

const requested = option('agents')?.split(',').map((a) => a.trim()).filter(Boolean);
const unknown = (requested || []).filter((a) => !ALL_AGENTS.includes(a));
if (unknown.length) { console.error(`Agente(s) no soportado(s): ${unknown.join(', ')}. Válidos: ${ALL_AGENTS.join(', ')}`); process.exit(1); }

const requestedStack = option('stack')?.split(',').map((s) => s.trim()).filter((s) => s && s !== 'none');
const unknownStack = (requestedStack || []).filter((s) => !STACK_SKILLS.includes(s));
if (unknownStack.length) { console.error(`Skill(s) de stack desconocida(s): ${unknownStack.join(', ')}. Válidas: ${STACK_SKILLS.join(', ')}, none`); process.exit(1); }

const log = [];
const note = (what, path) => log.push(`  ${what.padEnd(12)} ${relative(target, path) || '.'}`);
const read = (path) => { try { return readFileSync(path, 'utf8'); } catch { return null; } };

/** `managed`: archivo nuestro, se actualiza siempre. Si no, es texto del usuario y solo cambia con --force. */
function write(path, content, { managed = false } = {}) {
  const current = read(path);
  if (current === content) return;
  if (current !== null && !managed && !force) return note('conservado', path);
  note(current === null ? 'creado' : 'actualizado', path);
  if (dry) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function copyTree(from, to, opts) {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) copyTree(join(from, entry.name), join(to, entry.name), opts);
    else write(join(to, entry.name), readFileSync(join(from, entry.name), 'utf8'), opts);
  }
}

/** Fusiona con el JSON existente. Si no se puede leer, no lo toca: es configuración del usuario. */
function editJson(path, edit) {
  const current = read(path);
  let data = {};
  if (current !== null) {
    try { data = JSON.parse(current); } catch { return note('NO TOCADO', path); }
  }
  edit(data);
  write(path, `${JSON.stringify(data, null, 2)}\n`, { managed: true });
}

function resetHooks(data) {
  data.hooks ||= {};
  for (const event of Object.keys(data.hooks)) {
    data.hooks[event] = (data.hooks[event] || []).filter((entry) => !JSON.stringify(entry).includes(MARK));
    if (!data.hooks[event].length) delete data.hooks[event];
  }
  return data.hooks;
}

const nestedHook = (hooks, event, command, matcher) =>
  (hooks[event] ||= []).push({ ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command }] });

function link(path, to) {
  try { lstatSync(path); return; } catch { /* no existe: se crea */ }
  note('enlazado', path);
  if (dry) return;
  mkdirSync(dirname(path), { recursive: true });
  // Sin permiso para enlaces simbólicos (Windows sin modo desarrollador) se copia.
  try { symlinkSync(to, path, 'dir'); } catch { cpSync(resolve(dirname(path), to), path, { recursive: true }); }
}

// ---------------------------------------------------------------- núcleo común a todos los agentes

const previous = (() => { try { return JSON.parse(read(join(target, '.harness', 'config.json'))) || {}; } catch { return {}; } })();
const agents = requested || previous.agents || ALL_AGENTS;

/** Mira los manifiestos de la raíz y de sus carpetas directas (frontend/, backend/, apps…). */
function detectStack(dir) {
  const dirs = [dir, ...readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => join(dir, e.name))];
  const found = new Set();
  for (const d of dirs) {
    let deps = {};
    try { const pkg = JSON.parse(read(join(d, 'package.json'))); deps = { ...pkg.dependencies, ...pkg.devDependencies }; } catch { /* sin package.json */ }
    const py = ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'].map((f) => read(join(d, f)) || '').join('\n').toLowerCase();
    if (deps.react || deps.next) found.add('react');
    if (deps.next) found.add('nextjs');
    if (/\bdjango\b/.test(py)) found.add('django');
    if (/\bfastapi\b/.test(py)) found.add('fastapi');
    const jsDb = ['prisma', '@prisma/client', 'drizzle-orm', 'typeorm', 'sequelize', 'knex', 'mongoose', 'pg', 'mysql2', 'better-sqlite3'];
    if (/\bdjango\b/.test(py) || jsDb.some((n) => deps[n]) || /\b(sqlalchemy|sqlmodel|psycopg\d?|asyncpg|alembic|tortoise-orm)\b/.test(py)) found.add('database');
  }
  return [...found];
}
// `architecture` vale para cualquier proyecto; el resto solo si el proyecto usa esa tecnología.
const stack = requestedStack || [...new Set(['architecture', ...(previous.stack || []), ...detectStack(target)])];

copyTree(join(TPL, 'harness'), join(target, '.harness'), { managed: true });
editJson(join(target, '.harness', 'config.json'), (cfg) => {
  cfg.version = VERSION;
  cfg.agents = agents;
  cfg.stack = stack;
  cfg.protectedBranches = flag('team') ? ['main', 'master'] : (cfg.protectedBranches || []);
  cfg.agentPush ||= 'ask';
  cfg.maxContextChars ||= 1500;
});
copyTree(join(TPL, 'skills'), join(target, '.agents', 'skills'));
for (const name of stack) copyTree(join(TPL, 'skills-stack', name), join(target, '.agents', 'skills', name));
copyTree(join(TPL, 'docs'), join(target, 'docs'));

const block = readFileSync(join(TPL, 'AGENTS.block.md'), 'utf8').trim();
const agentsPath = join(target, 'AGENTS.md');
const agentsMd = read(agentsPath);
if (agentsMd === null) write(agentsPath, `# ${basename(target)}\n\n${block}\n`);
else {
  const start = agentsMd.indexOf(BLOCK_START);
  const end = agentsMd.indexOf(BLOCK_END);
  if (start < 0 || end < start) write(agentsPath, `${agentsMd.trimEnd()}\n\n${block}\n`, { managed: true });
  else if (agentsMd.slice(start, end + BLOCK_END.length) !== block) {
    if (force) write(agentsPath, agentsMd.slice(0, start) + block + agentsMd.slice(end + BLOCK_END.length), { managed: true });
    else note('conservado', agentsPath);
  }
}

// Dos personas añadiendo decisiones a la vez: git conserva ambas en lugar de dar conflicto.
const attributesPath = join(target, '.gitattributes');
const attributes = read(attributesPath) || '';
if (!attributes.includes('docs/decisions.md')) {
  write(attributesPath, `${attributes}${attributes && !attributes.endsWith('\n') ? '\n' : ''}docs/decisions.md merge=union\n`, { managed: true });
}

// ---------------------------------------------------------------- adaptadores por agente

const skillNames = [...new Set([
  ...readdirSync(join(TPL, 'skills')),
  ...stack,
  ...(existsSync(join(target, '.agents', 'skills')) ? readdirSync(join(target, '.agents', 'skills')) : []),
])];

const ADAPTERS = {
  claude() {
    const claudeMd = join(target, 'CLAUDE.md');
    const current = read(claudeMd);
    if (current === null) write(claudeMd, '@AGENTS.md\n');
    else if (!current.includes('AGENTS.md')) write(claudeMd, `${current.trimEnd()}\n\n@AGENTS.md\n`, { managed: true });
    editJson(join(target, '.claude', 'settings.json'), (data) => {
      const hooks = resetHooks(data);
      nestedHook(hooks, 'SessionStart', 'node "$CLAUDE_PROJECT_DIR/.harness/hooks/session-start.mjs" claude');
      nestedHook(hooks, 'PreToolUse', 'node "$CLAUDE_PROJECT_DIR/.harness/hooks/guard.mjs" claude', 'Bash');
    });
    // Claude Code solo descubre skills en .claude/skills/; los demás leen .agents/skills/ o el índice de AGENTS.md.
    for (const name of skillNames) link(join(target, '.claude', 'skills', name), join('..', '..', '.agents', 'skills', name));
  },
  codex() {
    editJson(join(target, '.codex', 'hooks.json'), (data) => {
      const hooks = resetHooks(data);
      nestedHook(hooks, 'SessionStart', 'node .harness/hooks/session-start.mjs codex', 'startup|resume|clear|compact');
      nestedHook(hooks, 'PreToolUse', 'node .harness/hooks/guard.mjs codex', 'Bash');
    });
  },
  cursor() {
    editJson(join(target, '.cursor', 'hooks.json'), (data) => {
      const hooks = resetHooks(data);
      data.version ||= 1;
      (hooks.sessionStart ||= []).push({ command: 'node .harness/hooks/session-start.mjs cursor' });
      (hooks.beforeShellExecution ||= []).push({ command: 'node .harness/hooks/guard.mjs cursor' });
    });
  },
  gemini() {
    editJson(join(target, '.gemini', 'settings.json'), (data) => {
      // Gemini CLI lee GEMINI.md por defecto; así lee el mismo AGENTS.md que los demás.
      data.context ||= {};
      const names = [].concat(data.context.fileName || ['GEMINI.md']);
      if (!names.includes('AGENTS.md')) names.unshift('AGENTS.md');
      data.context.fileName = names;
      const hooks = resetHooks(data);
      nestedHook(hooks, 'SessionStart', 'node .harness/hooks/session-start.mjs gemini');
      nestedHook(hooks, 'BeforeTool', 'node .harness/hooks/guard.mjs gemini', 'run_shell_command');
    });
  },
  opencode() {
    const plugin = join(target, '.opencode', 'plugins', 'harness.js');
    const current = read(plugin);
    if (current !== null && !current.includes('harness:managed')) return note('NO TOCADO', plugin);
    write(plugin, readFileSync(join(TPL, 'opencode', 'harness.js'), 'utf8'), { managed: true });
  },
};

for (const agent of agents) ADAPTERS[agent]();

// ---------------------------------------------------------------- resultado

console.log(`milan-harness ${VERSION} → ${target}${dry ? '  (simulación: no se ha escrito nada)' : ''}`);
console.log(`  skills de stack: ${stack.join(', ') || 'ninguna'}`);
console.log(log.length ? log.join('\n') : '  sin cambios');
if (log.some((l) => l.includes('conservado'))) console.log('\n«conservado»: ya existía con contenido distinto al de la plantilla. Usa --force para actualizarlo.');
if (log.some((l) => l.includes('NO TOCADO'))) console.log('\n«NO TOCADO»: el archivo existe y no es del harness o no es JSON válido. Revísalo a mano.');
if (dry) process.exit(0);

if (spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: target }).status !== 0) {
  console.log('\nEl proyecto no es un repositorio git. Ejecuta `git init`: la memoria se comparte por git.');
}
console.log('');
const status = runDoctor(target);
if (status === 0) {
  console.log('\nSiguiente paso: abre tu agente en el proyecto y pídele «usa la skill setup».');
  if (agents.includes('codex')) console.log('Codex: ejecuta /hooks una vez para confiar en los hooks del proyecto.');
}
process.exit(status);
