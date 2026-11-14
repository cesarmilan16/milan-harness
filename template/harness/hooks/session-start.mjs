#!/usr/bin/env node
// Inyecta el estado del proyecto al iniciar sesión (y tras compactar, donde el agente lo soporta).
//   node .harness/hooks/session-start.mjs            → texto plano, para ejecutarlo a mano
//   node .harness/hooks/session-start.mjs <agente>   → JSON en el formato de hooks de ese agente
import { buildContext } from './lib.mjs';

const agent = process.argv[2];
let text = '';
try { text = buildContext(undefined, agent); } catch { /* nunca romper el arranque de una sesión */ }
if (!text) process.exit(0);

if (!agent) console.log(text);
else if (agent === 'cursor') process.stdout.write(JSON.stringify({ additional_context: text }));
else process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
