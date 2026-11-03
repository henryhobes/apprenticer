import { STEPS, tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const bin = new URL('../bin/apprenticer.ts', import.meta.url).pathname;
const run = (...args: string[]) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: { ...process.env, OPENAI_API_KEY: '' } });

test('check passes a good space and fails, with what to fix, on a bad one', () => {
  const good = run('check', tmpSpace({ 'brief.md': '# Good\n\nBe good.', 'visuals/a.html': STEPS, 'notes/m.md': '<!-- Memory. -->' }));
  assert.equal(good.status, 0);
  assert.match(good.stdout, /Good: 1 visuals, 1 notes, 0 sources/);
  const bad = run('check', tmpSpace({ 'brief.md': '', 'visuals/a.html': '<svg></svg>' }));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /error: brief\.md is missing or empty/);
  assert.match(bad.stdout, /error: visuals\/a\.html must open with/);
});

test('init makes a starting space, keeps what is already there, and ends up passing check', () => {
  const dir = join(tmpSpace({}), 'mine');
  const first = run('init', dir);
  assert.equal(first.status, 0);
  for (const f of ['brief.md', 'notes/memory.md', 'visuals/.gitkeep', 'sources/.gitkeep']) assert.ok(existsSync(join(dir, f)), f);
  assert.equal(readFileSync(join(dir, '.gitignore'), 'utf8'), 'sessions/\n');
  assert.ok(run('init', dir).stdout.split('\n').filter(l => l.startsWith('kept')).length >= 5);
  assert.equal(run('check', dir).status, 0);
  // The coding agent's guide ships as template/AGENTS.md and is copied in, with a CLAUDE.md that points at it.
  assert.ok(existsSync(new URL('../template/AGENTS.md', import.meta.url)));
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), readFileSync(new URL('../template/AGENTS.md', import.meta.url), 'utf8'));
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
});

test('a persona.md at the space root (for sim) is not a problem for check', () => {
  const result = run('check', tmpSpace({ 'brief.md': '# Good\n\nBe good.', 'persona.md': '# Sam\n\nNo leading comment here.', 'sessions/2026-01-01T00-00-00/transcript.md': 'x' }));
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, /persona/);
});

test('serving needs a brief, and sim needs a user file', () => {
  assert.match(run(tmpSpace({}), '--no-open').stderr, /no brief\.md/);
  assert.match(run('sim', tmpSpace({ 'brief.md': '# x' })).stderr, /sim needs --user/);
  assert.match(run('--help').stdout, /apprenticer sim <dir>/);
});

test('preview serves only the visuals preview, with no API key', async () => {
  const dir = tmpSpace({ 'brief.md': '# Good\n\nBe good.', 'visuals/a.html': STEPS });
  const child = spawn(process.execPath, [bin, 'preview', dir, '--no-open'], { env: { ...process.env, OPENAI_API_KEY: '', PORT: '0' } });
  try {
    const url = await new Promise<string>((done, fail) => { child.stdout.on('data', d => { const m = /→ (\S+)/.exec(String(d)); if (m) done(m[1]); }); child.on('exit', () => fail(new Error('exited'))); });
    assert.match(url, /\/preview$/);
    assert.match(await (await fetch(url)).text(), /Three steps/);
    assert.equal((await fetch(new URL('/', url))).status, 404);
  } finally { child.kill(); }
});

test('a malformed MIND_PRICE is refused rather than turned into a mind that costs nothing', () => {
  const result = spawnSync(process.execPath, [bin, 'check', tmpSpace({ 'brief.md': '# Good\n\nBe good.' })], { encoding: 'utf8', env: { ...process.env, MIND_PRICE: '2;0.1;10' } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MIND_PRICE is three numbers/);
});
