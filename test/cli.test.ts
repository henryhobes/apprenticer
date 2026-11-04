import { STEPS, tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const bin = new URL('../bin/apprenticer.ts', import.meta.url).pathname;
const run = (...args: string[]) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: { ...process.env, OPENAI_API_KEY: '' } });
const HINT = 'For an agent that keeps its skills elsewhere: apprenticer skill <its skills folder>/apprenticer';

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
  // The guide is the skill, copied in without its front-matter, with a CLAUDE.md that points at it; init prints the interview for the agent.
  const skill = readFileSync(new URL('../skill/SKILL.md', import.meta.url), 'utf8'), agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(skill, /^---\nname: apprenticer\ndescription: .+\n---\n/);
  assert.ok(agents.startsWith('# Building an Apprenticer space') && skill.endsWith(agents));
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
  assert.match(first.stdout, /Interview the user first[\s\S]*5\. What do you hate/);
});

test('skill installs the guide as a skill, front-matter and all, and stays quiet about other folders when told one', () => {
  const dir = join(tmpSpace({}), 'skills', 'apprenticer');
  const result = run('skill', dir);
  assert.equal(result.status, 0);
  assert.equal(readFileSync(join(dir, 'SKILL.md'), 'utf8'), readFileSync(new URL('../skill/SKILL.md', import.meta.url), 'utf8'));
  assert.doesNotMatch(result.stdout, /keeps its skills elsewhere/);
});

test('skill with no folder installs to Claude Code and says where another agent puts its skills', () => {
  const home = tmpSpace({});
  const result = spawnSync(process.execPath, [bin, 'skill'], { encoding: 'utf8', env: { ...process.env, OPENAI_API_KEY: '', HOME: home, USERPROFILE: home } });
  assert.equal(result.status, 0);
  const target = join(home, '.claude', 'skills', 'apprenticer', 'SKILL.md');
  assert.ok(existsSync(target), target);
  assert.equal(readFileSync(target, 'utf8'), readFileSync(new URL('../skill/SKILL.md', import.meta.url), 'utf8'));
  assert.match(result.stdout, /installed .*\.claude/);
  assert.ok(result.stdout.includes(HINT), result.stdout);
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
