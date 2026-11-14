#!/usr/bin/env node
// Guardia previo a comandos de shell. Solo ve lo que ejecuta el AGENTE; tu terminal no se toca.
//   node .harness/hooks/guard.mjs <claude|codex|gemini|cursor>     stdin = JSON del hook
// Si algo falla aquí dentro, deja pasar: un guardia roto no debe bloquear la shell.
import { CONFIRM_PREFIX, askMessage, checkCommand, confirmMessage, denyMessage, readStdinJson } from './lib.mjs';

const agent = process.argv[2] || 'claude';
const input = readStdinJson();
const cmd = input.tool_input?.command ?? input.command ?? '';

let verdict = { level: 'allow' };
try { verdict = checkCommand(cmd, { cwd: input.cwd }); } catch { process.exit(0); }
if (verdict.level === 'allow') process.exit(0);

const deny = verdict.level === 'deny';

if (agent === 'claude') {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: deny ? 'deny' : 'ask',
      permissionDecisionReason: deny ? denyMessage(verdict.reason) : askMessage(verdict.reason),
    },
  }));
  process.exit(0);
}

if (agent === 'cursor') {
  const message = deny ? denyMessage(verdict.reason) : askMessage(verdict.reason);
  process.stdout.write(JSON.stringify({ permission: deny ? 'deny' : 'ask', user_message: message, agent_message: message }));
  process.exit(0);
}

// Codex y Gemini: código de salida 2 bloquea y stderr llega al agente como motivo.
if (!deny && String(cmd).trimStart().startsWith(CONFIRM_PREFIX)) process.exit(0);
process.stderr.write(deny ? denyMessage(verdict.reason) : confirmMessage(verdict.reason));
process.exit(2);
