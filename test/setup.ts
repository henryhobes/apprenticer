// Imported first by every test: a fake key (a test that reaches the model stubs it), and throwaway spaces.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

process.env.OPENAI_API_KEY = 'sk-test';

/** A space in a temp folder from { 'brief.md': '...', 'notes/memory.md': '...' }. */
export function tmpSpace(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'apprenticer-test-'));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

export const STEPS = '<!-- Three steps. Opens the session, then builds up as the words are said. "set play" runs it. -->\n<svg><g class="step"></g><g class="step" data-cue="two"></g><g class="step" data-cue="three"></g></svg>';
