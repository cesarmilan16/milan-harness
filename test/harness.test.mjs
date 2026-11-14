import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL = join(REPO, 'install.mjs');
let project;

const git = (...args) => execFileSync('git', args, { cwd: project, encoding: 'utf8' });
const install = (...args) => spawnSync(process.execPath, [INSTALL, project, ...args], { encoding: 'utf8' });
const json = (...path) => JSON.parse(readFileSync(join(project, ...path), 'utf8'));
const hook = (script, agent, input) => spawnSync(process.execPath, [join(project, '.harness', 'hooks', `${script}.mjs`), agent], {
  input: JSON.stringify(input), encoding: 'utf8', cwd: project,
});
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command }, cwd: project });

before(() => {
  project = mkdtempSync(join(tmpdir(), 'harness-test-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(join(project, 'AGENTS.md'), '# Mi proyecto\n\nRegla propia del equipo.\n');
});
after(() => rmSync(project, { recursive: true, force: true }));

test('instala todos los agentes y el doctor sale sano', () => {
  const result = install();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Sano/);
  for (const path of ['.harness/hooks/lib.mjs', '.agents/skills/task/SKILL.md', '.agents/roles/reviewer.md', '.claude/agents/implementer.md', '.codex/agents/reviewer.toml',
    '.cursor/agents/implementer.md', '.gemini/agents/reviewer.md', '.opencode/agents/implementer.md', 'docs/project.md', 'CLAUDE.md',
    '.claude/skills/task/SKILL.md', '.codex/hooks.json', '.cursor/hooks.json', '.gemini/settings.json', '.opencode/plugins/harness.js']) {
    assert.ok(existsSync(join(project, path)), `falta ${path}`);
  }
  const agentsMd = readFileSync(join(project, 'AGENTS.md'), 'utf8');
  assert.match(agentsMd, /Regla propia del equipo/);
  assert.match(agentsMd, /harness:start/);
  assert.deepEqual(json('.gemini', 'settings.json').context.fileName, ['AGENTS.md', 'GEMINI.md']);
});

test('reinstalar no duplica hooks y conserva el texto del usuario', () => {
  const settings = join(project, '.claude', 'settings.json');
  const data = json('.claude', 'settings.json');
  data.hooks.PreToolUse.push({ matcher: 'Write', hooks: [{ type: 'command', command: 'echo mio' }] });
  data.permissions = { allow: ['Bash(npm test)'] };
  writeFileSync(settings, JSON.stringify(data));
  const skill = join(project, '.agents', 'skills', 'verify', 'SKILL.md');
  writeFileSync(skill, `${readFileSync(skill, 'utf8')}\nRegla añadida por el equipo.\n`);

  const result = install();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const after = json('.claude', 'settings.json');
  assert.equal(after.hooks.SessionStart.length, 1);
  assert.equal(after.hooks.PreToolUse.length, 2);
  assert.deepEqual(after.permissions, { allow: ['Bash(npm test)'] });
  assert.match(readFileSync(skill, 'utf8'), /Regla añadida por el equipo/);
  assert.equal(json('.cursor', 'hooks.json').hooks.beforeShellExecution.length, 1);
  assert.equal(readFileSync(join(project, 'AGENTS.md'), 'utf8').split('harness:start').length, 2);
});

test('no rompe un JSON de configuración inválido', () => {
  const path = join(project, '.codex', 'hooks.json');
  const original = readFileSync(path, 'utf8');
  writeFileSync(path, '{ roto');
  const result = install();
  assert.match(result.stdout, /NO TOCADO/);
  assert.equal(readFileSync(path, 'utf8'), '{ roto');
  writeFileSync(path, original);
});

test('el inicio de sesión muestra la feature de la rama y su siguiente paso', () => {
  git('add', '-A');
  git('commit', '-q', '-m', 'instala harness');
  git('switch', '-q', '-c', 'feat/login');
  const template = readFileSync(join(project, 'docs', 'features', '_template.md'), 'utf8');
  const doc = (owner, branch, title, next) => template
    .replace('owner:', `owner: ${owner}`).replace('branch:', `branch: ${branch}`)
    .replace('Título de la feature', title)
    .replace('- [ ] Tarea — comprobación:', '- [x] Formulario — test: ok\n- [ ] Sesión — test:')
    .replace(/(## Siguiente paso\n)/, `$1${next}\n`);
  writeFileSync(join(project, 'docs', 'features', 'login.md'), doc('cesar', 'feat/login', 'Login con email', 'Implementar la cookie de sesión en src/auth.ts.'));
  writeFileSync(join(project, 'docs', 'features', 'pagos.md'), doc('ana', 'feat/pagos', 'Pagos', 'Webhook de Stripe.'));

  const plain = spawnSync(process.execPath, [join(project, '.harness', 'hooks', 'session-start.mjs')], { encoding: 'utf8' }).stdout;
  assert.match(plain, /Rama: feat\/login/);
  assert.match(plain, /docs\/features\/login\.md — Login con email \[1\/2\]/);
  assert.match(plain, /Siguiente paso: Implementar la cookie de sesión/);
  assert.match(plain, /pagos\.md \(ana, feat\/pagos\)/);
  assert.doesNotMatch(plain, /_template/);
  assert.ok(plain.length <= 1500);

  const claude = JSON.parse(hook('session-start', 'claude', {}).stdout);
  assert.equal(claude.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(claude.hookSpecificOutput.additionalContext, /Login con email/);
  assert.match(JSON.parse(hook('session-start', 'cursor', {}).stdout).additional_context, /Login con email/);
});

test('el guardia pide confirmación ante comandos destructivos y deja pasar el resto', () => {
  const decision = (command) => {
    const out = hook('guard', 'claude', bash(command)).stdout;
    return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : 'allow';
  };
  for (const command of ['git reset --hard HEAD~1', 'cd app && git clean -fd', 'git checkout -- .', 'git push --force origin feat/x',
    'git push -f', 'git branch -D vieja', 'rm -rf .', 'sudo rm -rf /', 'rm -fr ~/', 'rm -rf "./*"', 'psql -c "DROP TABLE users"',
    'sqlite3 db "delete from users;"']) {
    assert.equal(decision(command), 'ask', command);
  }
  for (const command of ['git status', 'git commit -m "explica git reset --hard"', 'rm -rf node_modules', 'rm -rf ./dist', 'rm notas.txt',
    'git restore --staged .', 'git checkout main', 'npm test', 'psql -c "delete from users where id = 3"',
    'git add -A && git commit -m "feat: login"', 'git log --grep push']) {
    assert.equal(decision(command), 'allow', command);
  }
});

test('el agente commitea pero publicar pide confirmación, salvo agentPush allow', () => {
  const decision = (command) => {
    const out = hook('guard', 'claude', bash(command)).stdout;
    return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : 'allow';
  };
  assert.equal(json('.harness', 'config.json').agentPush, 'ask');
  for (const command of ['git push', 'git push -u origin feat/login', 'git commit -m "x" && git push', 'gh pr merge 12 --squash']) {
    assert.equal(decision(command), 'ask', command);
  }
  assert.equal(hook('guard', 'codex', bash('git push')).status, 2);
  assert.equal(hook('guard', 'codex', bash('HARNESS_OK=1 git push')).status, 0);

  const path = join(project, '.harness', 'config.json');
  const original = readFileSync(path, 'utf8');
  writeFileSync(path, JSON.stringify({ ...JSON.parse(original), agentPush: 'allow' }));
  assert.equal(decision('git push -u origin feat/login'), 'allow');
  assert.equal(decision('git push --force'), 'ask');
  writeFileSync(path, original);
});

test('cada agente recibe la respuesta en su formato', () => {
  const cursor = JSON.parse(hook('guard', 'cursor', { command: 'git reset --hard', cwd: project }).stdout);
  assert.equal(cursor.permission, 'ask');

  for (const agent of ['codex', 'gemini']) {
    const blocked = hook('guard', agent, bash('git reset --hard'));
    assert.equal(blocked.status, 2);
    assert.match(blocked.stderr, /HARNESS_OK=1/);
    assert.equal(hook('guard', agent, bash('HARNESS_OK=1 git reset --hard')).status, 0);
    assert.equal(hook('guard', agent, bash('git status')).status, 0);
  }
  assert.equal(hook('guard', 'claude', {}).status, 0);
  assert.equal(spawnSync(process.execPath, [join(project, '.harness', 'hooks', 'guard.mjs'), 'claude'], { input: 'no es json', encoding: 'utf8' }).status, 0);
});

test('--team protege main: ni commit ni push directos, y sin atajo de confirmación', () => {
  assert.equal(install('--team').status, 0);
  assert.deepEqual(json('.harness', 'config.json').protectedBranches, ['main', 'master']);
  const claude = (command) => {
    const out = hook('guard', 'claude', bash(command)).stdout;
    return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : 'allow';
  };
  assert.equal(claude('git commit -m "en rama"'), 'allow');
  assert.equal(claude('git push'), 'ask');
  assert.equal(claude('git push origin HEAD:main'), 'deny');
  assert.equal(claude('git push origin main'), 'deny');

  git('add', '-A');
  git('commit', '-q', '-m', 'features');
  git('switch', '-q', 'main');
  // La configuración viaja por git: main no está protegida hasta que le llega el cambio.
  assert.equal(claude('git commit -m "directo"'), 'allow');
  git('merge', '-q', 'feat/login');
  assert.equal(claude('git commit -m "directo"'), 'deny');
  assert.equal(claude('git add . && git commit -m "directo"'), 'deny');
  assert.equal(claude('git push'), 'deny');
  assert.equal(claude('git push origin feat/login'), 'ask');
  assert.equal(claude('git log --oneline'), 'allow');
  assert.equal(hook('guard', 'codex', bash('HARNESS_OK=1 git commit -m "directo"')).status, 2);
});

test('el inicio de sesión muestra el progreso del plan y los modelos del agente', () => {
  writeFileSync(join(project, 'docs', 'plan.md'), [
    '# Plan', '', '## Hito 1 — Base', '',
    '- [x] **T01** [S] Esqueleto con tests · prueba: npm test',
    '- [ ] **T02** [M] Registro de usuarios · depende: T01 · prueba: test de alta',
    '- [ ] **T03** [L] Sesiones y permisos · depende: T02 · riesgo: alto',
    '- [ ] una línea que no sigue el formato', '',
  ].join('\n'));
  try {
    const claude = JSON.parse(hook('session-start', 'claude', {}).stdout).hookSpecificOutput.additionalContext;
    assert.match(claude, /Plan \(docs\/plan\.md\): 1\/3 tareas hechas · siguiente: T02 \[M\] Registro de usuarios$/m);
    assert.match(claude, /Modelos por tamaño de tarea: S→haiku · M→sonnet · L→opus/);
    // Sin modelos configurados no se promete nada: se usa el de la sesión.
    assert.doesNotMatch(JSON.parse(hook('session-start', 'codex', {}).stdout).hookSpecificOutput.additionalContext, /Modelos por tamaño/);

    const path = join(project, '.harness', 'config.json');
    const cfg = json('.harness', 'config.json');
    cfg.models.claude.avanzado = 'mi-modelo';
    writeFileSync(path, JSON.stringify(cfg));
    assert.equal(install().status, 0);
    assert.equal(json('.harness', 'config.json').models.claude.avanzado, 'mi-modelo');
  } finally {
    rmSync(join(project, 'docs', 'plan.md'));
  }
});

test('no pisa un subagente propio con el mismo nombre', () => {
  const path = join(project, '.claude', 'agents', 'reviewer.md');
  const original = readFileSync(path, 'utf8');
  writeFileSync(path, '---\nname: reviewer\ndescription: el mío\n---\nMi revisor.\n');
  assert.match(install().stdout, /NO TOCADO\s+\.claude\/agents\/reviewer\.md/);
  assert.match(readFileSync(path, 'utf8'), /Mi revisor/);
  writeFileSync(path, original);
});

test('con modelos configurados genera una variante de subagente por nivel', () => {
  const agentsDir = (agent) => readdirSync(join(project, `.${agent}`, 'agents')).sort();
  assert.deepEqual(agentsDir('codex'), ['implementer.toml', 'reviewer.toml']);
  assert.doesNotMatch(readFileSync(join(project, '.codex', 'agents', 'implementer.toml'), 'utf8'), /^model =/m);
  assert.match(readFileSync(join(project, '.cursor', 'agents', 'reviewer.md'), 'utf8'), /model: inherit\nreadonly: true/);
  assert.match(readFileSync(join(project, '.opencode', 'agents', 'reviewer.md'), 'utf8'), /mode: subagent\ntools:\n  edit: false/);

  const path = join(project, '.harness', 'config.json');
  const cfg = json('.harness', 'config.json');
  cfg.models.codex = { economico: 'barato', estandar: 'medio', avanzado: 'caro' };
  writeFileSync(path, JSON.stringify(cfg));
  assert.equal(install().status, 0);
  assert.deepEqual(agentsDir('codex'), ['implementer-avanzado.toml', 'implementer-economico.toml', 'implementer.toml', 'reviewer-avanzado.toml', 'reviewer.toml']);
  const cheap = readFileSync(join(project, '.codex', 'agents', 'implementer-economico.toml'), 'utf8');
  assert.match(cheap, /name = "implementer-economico"/);
  assert.match(cheap, /model = "barato"/);
  assert.match(readFileSync(join(project, '.codex', 'agents', 'reviewer-avanzado.toml'), 'utf8'), /model = "caro"/);
  // Claude Code recibe el modelo al lanzar: nunca variantes.
  assert.deepEqual(agentsDir('claude'), ['implementer.md', 'reviewer.md']);
  assert.match(JSON.parse(hook('session-start', 'codex', {}).stdout).hookSpecificOutput.additionalContext, /S→barato · M→medio · L→caro/);
});

test('instala las skills del stack detectado, también en subcarpetas', () => {
  const other = mkdtempSync(join(tmpdir(), 'harness-test-'));
  const skills = () => readdirSync(join(other, '.agents', 'skills')).sort();
  const run = (...args) => spawnSync(process.execPath, [INSTALL, other, '--agents', 'claude', ...args], { encoding: 'utf8' });
  try {
    assert.equal(run().status, 0);
    assert.deepEqual(skills(), ['architecture', 'handoff', 'project-plan', 'resume', 'review', 'setup', 'task', 'verify']);

    mkdirSync(join(other, 'web'));
    mkdirSync(join(other, 'api'));
    writeFileSync(join(other, 'web', 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' } }));
    writeFileSync(join(other, 'api', 'requirements.txt'), 'fastapi==0.115\nsqlalchemy>=2\n');
    const result = run();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(skills(), ['architecture', 'database', 'fastapi', 'handoff', 'nextjs', 'project-plan', 'react', 'resume', 'review', 'setup', 'task', 'verify']);
    assert.ok(existsSync(join(other, '.claude', 'skills', 'nextjs', 'SKILL.md')));
    assert.ok(!existsSync(join(other, '.agents', 'skills', 'django')));

    assert.equal(run('--stack', 'django').status, 0);
    assert.ok(existsSync(join(other, '.agents', 'skills', 'django', 'SKILL.md')));
    assert.equal(run('--stack', 'cobol').status, 1);
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
});

test('--agents limita el cableado y --dry-run no escribe', () => {
  const other = mkdtempSync(join(tmpdir(), 'harness-test-'));
  try {
    const dry = spawnSync(process.execPath, [INSTALL, other, '--dry-run'], { encoding: 'utf8' });
    assert.equal(dry.status, 0);
    assert.ok(!existsSync(join(other, 'AGENTS.md')));
    const result = spawnSync(process.execPath, [INSTALL, other, '--agents', 'claude,opencode'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.ok(existsSync(join(other, '.claude', 'settings.json')));
    assert.ok(!existsSync(join(other, '.codex')));
    assert.ok(!existsSync(join(other, '.cursor')));
    assert.equal(spawnSync(process.execPath, [INSTALL, other, '--agents', 'vim'], { encoding: 'utf8' }).status, 1);
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
});
