#!/usr/bin/env node
// Comprueba que el harness está bien montado. Solo lee; no cambia nada.
//   node .harness/doctor.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, buildContext, checkCommand, config, features, git } from './hooks/lib.mjs';

let errors = 0;
let warnings = 0;
const ok = (m) => console.log(`  ok      ${m}`);
const warn = (m) => { warnings++; console.log(`  aviso   ${m}`); };
const fail = (m) => { errors++; console.log(`  ERROR   ${m}`); };
const read = (...p) => { try { return readFileSync(join(ROOT, ...p), 'utf8'); } catch { return null; } };

console.log(`harness doctor — ${ROOT}`);

if (Number(process.versions.node.split('.')[0]) < 18) fail(`Node ${process.versions.node}: hace falta >= 18`);
if (git(['rev-parse', '--is-inside-work-tree']) === 'true') ok('repositorio git');
else warn('no es un repositorio git: la memoria no se comparte y no hay estado de rama');

const cfg = config();
if (!Array.isArray(cfg.agents)) fail('.harness/config.json falta o no es válido');
else ok(`config: agentes [${cfg.agents.join(', ')}], ramas protegidas [${(cfg.protectedBranches || []).join(', ') || 'ninguna'}], push del agente: ${cfg.agentPush === 'allow' ? 'libre' : 'con tu confirmación'}`);

// --- instrucciones siempre cargadas: es el coste fijo de cada sesión
const agentsMd = read('AGENTS.md');
if (!agentsMd?.includes('<!-- harness:start')) fail('AGENTS.md no contiene el bloque del harness');
else {
  const tokens = Math.round(agentsMd.length / 3.5);
  (tokens > 2500 ? warn : ok)(`AGENTS.md: ~${tokens} tokens cargados en cada sesión${tokens > 2500 ? ' — recórtalo, mueve detalle a docs/ o a una skill' : ''}`);
}

// --- memoria
const project = read('docs', 'project.md');
if (project === null) fail('falta docs/project.md');
else if (project.includes('harness:pendiente')) warn('docs/project.md sin rellenar: pide al agente la skill `setup`');
else (project.split('\n').length > 80 ? warn : ok)(`docs/project.md: ${project.split('\n').length} líneas${project.split('\n').length > 80 ? ' — demasiado largo, se lee en cada tarea' : ''}`);
if (read('docs', 'decisions.md') === null) fail('falta docs/decisions.md');
if (read('docs', 'features', '_template.md') === null) fail('falta docs/features/_template.md');

for (const f of features()) {
  if (!['active', 'paused', 'done'].includes(f.status)) warn(`docs/features/${f.file}: status «${f.status}» no es active | paused | done`);
  else if (f.status === 'active' && !f.next) warn(`docs/features/${f.file}: activa pero sin «Siguiente paso»`);
  else if (f.status === 'active' && !f.branch) warn(`docs/features/${f.file}: activa pero sin rama`);
}

// --- skills
let skills = [];
try { skills = readdirSync(join(ROOT, '.agents', 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { /* sin skills */ }
if (!skills.length) fail('no hay skills en .agents/skills/');
for (const name of skills) {
  const fm = read('.agents', 'skills', name, 'SKILL.md')?.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!fm || !/^name:\s*\S/m.test(fm) || !/^description:\s*\S/m.test(fm)) fail(`.agents/skills/${name}/SKILL.md sin frontmatter name/description`);
}
if (skills.length) ok(`${skills.length} skills: ${skills.join(', ')}`);

// --- cableado por agente
const WIRING = {
  claude: ['.claude/settings.json', '.harness/hooks/'],
  codex: ['.codex/hooks.json', '.harness/hooks/'],
  cursor: ['.cursor/hooks.json', '.harness/hooks/'],
  gemini: ['.gemini/settings.json', '.harness/hooks/'],
  opencode: ['.opencode/plugins/harness.js', 'harness:managed'],
};
for (const agent of cfg.agents || []) {
  const [file, needle] = WIRING[agent] || [];
  if (!file) { warn(`agente desconocido en config: ${agent}`); continue; }
  if (!read(file)?.includes(needle)) { fail(`${agent}: ${file} no tiene los hooks del harness`); continue; }
  if (agent === 'claude') {
    const missing = skills.filter((s) => !existsSync(join(ROOT, '.claude', 'skills', s, 'SKILL.md')));
    if (missing.length) { fail(`claude: skills sin enlazar en .claude/skills/: ${missing.join(', ')}`); continue; }
    if (!read('CLAUDE.md')?.includes('AGENTS.md')) { fail('claude: CLAUDE.md no importa AGENTS.md'); continue; }
  }
  ok(`${agent}: cableado en ${file}`);
}

// --- autotest de los hooks
try {
  const context = buildContext();
  const max = cfg.maxContextChars || 1500;
  if (context.length > max) fail(`el contexto de inicio mide ${context.length} > ${max} caracteres`);
  else ok(`contexto de inicio: ${context.length} caracteres (tope ${max})`);
  if (checkCommand('git reset --hard').level !== 'ask' || checkCommand('git status').level !== 'allow') fail('el guardia de comandos no responde como se espera');
  else ok('guardia de comandos operativo');
} catch (e) {
  fail(`los hooks fallan al ejecutarse: ${e.message}`);
}

console.log(errors ? `\n${errors} error(es), ${warnings} aviso(s).` : `\nSano${warnings ? `, con ${warnings} aviso(s)` : ''}.`);
process.exit(errors ? 1 : 0);
