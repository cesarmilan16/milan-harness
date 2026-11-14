// harness:managed — generado por milan-harness; se sobrescribe al reinstalar.
// OpenCode no tiene hooks de comando: este plugin hace lo mismo que session-start.mjs y guard.mjs.
import { CONFIRM_PREFIX, buildContext, checkCommand, confirmMessage, denyMessage } from '../../.harness/hooks/lib.mjs';

export const HarnessPlugin = async ({ directory, worktree }) => {
  const root = worktree || directory;
  // El mismo texto durante toda la sesión: si cambiara en cada turno invalidaría la caché del prompt.
  const contextBySession = new Map();
  return {
    'experimental.chat.system.transform': async (input, output) => {
      if (!Array.isArray(output?.system)) return;
      const id = input?.sessionID || 'default';
      if (!contextBySession.has(id)) {
        let text = '';
        try { text = buildContext(root); } catch { /* nunca romper la sesión */ }
        contextBySession.set(id, text);
      }
      const text = contextBySession.get(id);
      if (text) output.system.push(text);
    },
    'tool.execute.before': async (input, output) => {
      if (input?.tool !== 'bash') return;
      const cmd = output?.args?.command;
      let verdict = { level: 'allow' };
      try { verdict = checkCommand(cmd, { cwd: root, root }); } catch { return; }
      if (verdict.level === 'allow') return;
      if (verdict.level === 'deny') throw new Error(denyMessage(verdict.reason));
      if (String(cmd).trimStart().startsWith(CONFIRM_PREFIX)) return;
      throw new Error(confirmMessage(verdict.reason));
    },
  };
};
