import { STEPS, tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  const hasAgents = existsSync(new URL('../AGENTS.md', import.meta.url));
  assert.equal(existsSync(join(dir, 'AGENTS.md')), hasAgents); // copied when the repo has one
  assert.equal(existsSync(join(dir, 'CLAUDE.md')) && readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), hasAgents && '@AGENTS.md\n');
});

test('serving needs a brief, and sim needs a user file', () => {
  assert.match(run(tmpSpace({}), '--no-open').stderr, /no brief\.md/);
  assert.match(run('sim', tmpSpace({ 'brief.md': '# x' })).stderr, /sim needs --user/);
  assert.match(run('--help').stdout, /apprenticer sim <dir>/);
});
