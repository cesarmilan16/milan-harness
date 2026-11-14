// Lógica compartida por todos los agentes. Sin dependencias: solo Node >= 18 y git.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Este archivo vive en <proyecto>/.harness/hooks/, así que la raíz no depende del cwd del agente.
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function config(root = ROOT) {
  try { return JSON.parse(readFileSync(join(root, '.harness', 'config.json'), 'utf8')); } catch { return {}; }
}

export function git(args, cwd = ROOT) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim();
  } catch { return ''; }
}

export function currentBranch(cwd = ROOT) {
  return git(['symbolic-ref', '--short', '-q', 'HEAD'], cwd) || git(['rev-parse', '--short', 'HEAD'], cwd);
}

export function readStdinJson() {
  try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

// ---------------------------------------------------------------- memoria: docs/features/*.md

export function features(root = ROOT) {
  const dir = join(root, 'docs', 'features');
  let files = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort(); } catch { return []; }
  return files.map((file) => {
    const text = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
    const meta = {};
    for (const line of (text.match(/^---\n([\s\S]*?)\n---/)?.[1] || '').split('\n')) {
      const m = line.match(/^(\w+):\s*(.*?)(?:\s+#.*)?$/);
      if (m) meta[m[1]] = m[2].trim();
    }
    const next = (text.match(/(?:^|\n)##\s+Siguiente paso[^\n]*\n([\s\S]*?)(?=\n##\s|$)/)?.[1] || '')
      .replace(/<!--[\s\S]*?-->/g, '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3).join(' ');
    const done = (text.match(/^\s*- \[x\]/gim) || []).length;
    const pending = (text.match(/^\s*- \[ \]/gm) || []).length;
    return {
      file,
      status: meta.status || '',
      owner: meta.owner || '',
      branch: meta.branch || '',
      title: text.match(/^#\s+(.+)$/m)?.[1].trim() || file,
      next,
      done,
      total: done + pending,
    };
  });
}

/** Tareas de docs/plan.md. El formato de línea lo fija la skill project-plan. */
export function planTasks(root = ROOT) {
  let text = '';
  try { text = readFileSync(join(root, 'docs', 'plan.md'), 'utf8').replace(/\r\n/g, '\n'); } catch { return []; }
  return [...text.matchAll(/^- \[( |x|X)\] \*\*(T\d+)\*\* \[(S|M|L)\] (.+)$/gm)].map((m) => ({
    done: m[1] !== ' ',
    id: m[2],
    size: m[3],
    title: m[4].split(' · ')[0].trim(),
  }));
}

const TIERS = [['S', 'economico'], ['M', 'estandar'], ['L', 'avanzado']];

/** Lo que se inyecta al iniciar sesión. Tope duro de tamaño: es contexto que se paga en cada sesión. */
export function buildContext(root = ROOT, agent = '') {
  const cfg = config(root);
  const max = cfg.maxContextChars || 1500;
  const lines = ['## Estado del proyecto'];
  const branch = currentBranch(root);
  if (branch) {
    const dirty = git(['status', '--porcelain'], root).split('\n').filter(Boolean).length;
    lines.push(`Rama: ${branch} · ${dirty ? `${dirty} archivo(s) sin commitear` : 'limpio'}`);
    const commits = git(['log', '-3', '--pretty=%h %s'], root);
    if (commits) lines.push('Últimos commits:', ...commits.split('\n').map((c) => `- ${c.slice(0, 90)}`));
  }
  const active = features(root).filter((f) => f.status === 'active');
  const mine = active.filter((f) => f.branch && f.branch === branch);
  const others = active.filter((f) => !mine.includes(f));
  for (const f of mine) {
    lines.push(`Feature de esta rama: docs/features/${f.file} — ${f.title} [${f.done}/${f.total}]`);
    lines.push(`Siguiente paso: ${f.next || '(sin anotar)'}`);
  }
  if (others.length) {
    lines.push(mine.length ? 'Otras features activas (no son de esta rama):' : 'Features activas:');
    for (const f of others.slice(0, 6)) {
      const who = `${f.owner || 'sin owner'}, ${f.branch || 'sin rama'}`;
      lines.push(`- docs/features/${f.file} (${who})${mine.length || !f.next ? '' : ` → ${f.next.slice(0, 120)}`}`);
    }
  }
  if (!active.length) lines.push('Sin feature activa.');
  const tasks = planTasks(root);
  if (tasks.length) {
    const next = tasks.find((t) => !t.done);
    const doneCount = tasks.filter((t) => t.done).length;
    lines.push(`Plan (docs/plan.md): ${doneCount}/${tasks.length} tareas hechas${next ? ` · siguiente: ${next.id} [${next.size}] ${next.title.slice(0, 100)}` : ' · completado'}`);
  }
  const models = cfg.models?.[agent] || {};
  const tiers = TIERS.filter(([, tier]) => models[tier]).map(([size, tier]) => `${size}→${models[tier]}`);
  if (tiers.length) lines.push(`Modelos por tamaño de tarea: ${tiers.join(' · ')}`);
  let project = '';
  try { project = readFileSync(join(root, 'docs', 'project.md'), 'utf8'); } catch { /* sin project.md */ }
  if (!project || project.includes('harness:pendiente')) {
    lines.push('docs/project.md está sin rellenar: usa la skill `project-plan` si el proyecto es nuevo, o `setup` si ya existe.');
  }
  lines.push(`${active.length ? 'Lee el documento de la feature antes de actuar. ' : ''}Contexto: docs/project.md · decisiones: docs/decisions.md`);
  const text = lines.join('\n');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ---------------------------------------------------------------- guardia de comandos

const stripQuoted = (cmd) => cmd.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
const segments = (cmd) => cmd.split(/&&|\|\||;|\||\n/).map((s) => s.trim()).filter(Boolean);
const GIT = String.raw`\bgit\s+(?:-C\s+\S+\s+)?`;

// Solo lo que destruye trabajo o historia compartida sin vuelta atrás. Lista corta a propósito:
// un guardia que salta con trabajo inofensivo acaba desactivado.
const GIT_ASK = [
  [new RegExp(`${GIT}reset\\b.*--hard\\b`), 'descarta los cambios sin commitear (git reset --hard)'],
  [new RegExp(`${GIT}clean\\b.*\\s-[a-zA-Z]*f`), 'borra archivos sin seguimiento (git clean -f)'],
  [new RegExp(`${GIT}(checkout|restore)\\s+(--\\s+)?\\.(\\s|$)`), 'descarta todos los cambios del directorio'],
  [new RegExp(`${GIT}push\\b.*(\\s--force\\b|\\s-[a-zA-Z]*f\\b)`), 'reescribe historia remota (push forzado)'],
  [new RegExp(`${GIT}branch\\b.*\\s-D\\b`), 'borra una rama aunque no esté fusionada'],
  [new RegExp(`${GIT}stash\\s+(drop|clear)\\b`), 'elimina cambios guardados en el stash'],
];
const PUBLISH_ASK = [
  [new RegExp(`${GIT}push\\b`), 'publica tus commits en el remoto (git push)'],
  [/\bgh\s+pr\s+merge\b/, 'fusiona un pull request (gh pr merge)'],
];
const SQL_ASK = [
  [/\b(drop\s+(table|database|schema)|truncate\s+table)\b/i, 'elimina datos o esquema de la base de datos'],
  [/\bdelete\s+from\s+[\w."`]+\s*(;|["']|$)/i, 'borra todas las filas de una tabla (DELETE sin WHERE)'],
];

function broadRm(segment) {
  const tokens = segment.split(/\s+/).map((t) => t.replace(/["']/g, ''));
  let i = 0;
  while (/^(sudo|command|\w+=\S*)$/.test(tokens[i] || '')) i++;
  if (tokens[i] !== 'rm') return false;
  const rest = tokens.slice(i + 1);
  const recursive = rest.some((a) => /^-[a-zA-Z]*[rR]/.test(a) || a === '--recursive');
  return recursive && rest.some((a) => a !== '' && /^(\/|~|\.|\.\.|\*|\$HOME|\$\{HOME\})?\/?\*?$/.test(a));
}

/** @returns {{level: 'allow'|'ask'|'deny', reason?: string}} */
export function checkCommand(cmd, { cwd, root = ROOT } = {}) {
  if (typeof cmd !== 'string' || !cmd.trim()) return { level: 'allow' };
  const clean = segments(stripQuoted(cmd));
  const protectedBranches = config(root).protectedBranches || [];

  if (protectedBranches.length) {
    let branch = null;
    const onProtected = () => protectedBranches.includes(branch ??= currentBranch(cwd || root));
    for (const seg of clean) {
      if (new RegExp(`${GIT}commit\\b`).test(seg) && onProtected()) {
        return { level: 'deny', reason: `commit directo en «${branch}», rama protegida. Crea una rama (git switch -c feat/<slug>) y commitea ahí` };
      }
      const push = seg.match(new RegExp(`${GIT}push\\b(.*)$`));
      if (!push) continue;
      const tokens = push[1].trim().split(/\s+/).filter(Boolean);
      const refs = tokens.filter((t) => !t.startsWith('-'));
      const named = refs.slice(1).some((r) => protectedBranches.includes(r.split(':').pop().replace(/^\+/, '')));
      const implicit = refs.length <= 1 && !tokens.includes('--tags') && onProtected();
      if (named || implicit) {
        return { level: 'deny', reason: 'push directo a una rama protegida. Sube tu rama y abre un pull request' };
      }
    }
  }

  for (const seg of segments(cmd)) if (broadRm(seg)) return { level: 'ask', reason: 'borra de forma recursiva una ruta amplia (rm -r)' };
  for (const seg of clean) for (const [re, reason] of GIT_ASK) if (re.test(seg)) return { level: 'ask', reason };
  for (const [re, reason] of SQL_ASK) if (re.test(cmd)) return { level: 'ask', reason };

  // El agente commitea; publicar lo decide la persona. `"agentPush": "allow"` en config.json lo desactiva.
  if (config(root).agentPush !== 'allow') {
    for (const seg of clean) for (const [re, reason] of PUBLISH_ASK) if (re.test(seg)) return { level: 'ask', reason };
  }
  return { level: 'allow' };
}

// En agentes sin «preguntar» nativo, el comando se bloquea y el agente debe pedir confirmación;
// con el sí del usuario lo repite con este prefijo. Es un freno, no un candado.
export const CONFIRM_PREFIX = 'HARNESS_OK=1 ';

export const denyMessage = (reason) => `harness: bloqueado — ${reason}. No busques otra vía para lograr lo mismo.`;
export const askMessage = (reason) => `harness: este comando ${reason}. Necesita la confirmación del usuario.`;
export const confirmMessage = (reason) =>
  `${askMessage(reason)} Explícale qué hace y pide confirmación explícita. ` +
  `Solo si dice que sí, repite el comando con el prefijo \`${CONFIRM_PREFIX.trim()}\`.`;
