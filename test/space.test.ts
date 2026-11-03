import { STEPS, tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEFAULT_MEMORY, SOURCE_CAP, lastRecap, newSessionDir, openSpace, readMeta, readSpace, spentToday, writeMeta, writeNotes } from '../src/space.ts';

const BRIEF = '# Mock interview\n\nYou are an interviewer for a backend role. Keep turns short.';

test('a space is its folder: brief, title, visuals in order with their notes, notes with what they hold, sources', () => {
  const dir = tmpSpace({
    'brief.md': BRIEF,
    'visuals/02-second.html': '<!-- Second one. Plays by itself; "set play" runs it again. -->\n<svg></svg>',
    'visuals/01-first.html': STEPS,
    'notes/candidate.md': '<!-- What the candidate has shown. -->\n\nStrong on caching.\n',
    'sources/rubric.md': 'Score 1-5.',
    'sources/.hidden': 'ignored',
  });
  const space = readSpace(dir);
  assert.equal(space.title, 'Mock interview');
  assert.deepEqual(space.errors, []);
  assert.deepEqual(space.visuals.map(v => v.id), ['01-first', '02-second']);
  assert.equal(space.visuals[0].title, 'Three steps');
  assert.match(space.visuals[0].when, /^Opens the session/);
  assert.ok(space.visuals.every(v => !v.html.trimStart().startsWith('<!--'))); // the note is the mind's, not drawn
  assert.deepEqual(space.notes, [{ name: 'candidate', about: 'What the candidate has shown.', body: 'Strong on caching.' }]);
  assert.deepEqual(space.sources, [{ name: 'sources/rubric.md', text: 'Score 1-5.' }]);
});

test('a title without a heading is the folder name; reading changes nothing and never throws', () => {
  const dir = tmpSpace({ 'brief.md': 'Just be helpful.' });
  const space = readSpace(dir);
  assert.match(space.title, /^apprenticer-test-/);
  assert.equal(existsSync(join(dir, 'notes')), false);
  const empty = readSpace(tmpSpace({}));
  assert.deepEqual(empty.errors, ['brief.md is missing or empty']);
});

test('opening a space makes notes/memory.md when there are no notes, and refuses a space with no brief', () => {
  const dir = tmpSpace({ 'brief.md': BRIEF });
  const space = openSpace(dir);
  assert.equal(readFileSync(join(dir, 'notes/memory.md'), 'utf8'), `<!-- ${DEFAULT_MEMORY} -->\n`);
  assert.deepEqual(space.errors, []); // the default comment is a titled one
  assert.equal(space.notes[0].name, 'memory');
  assert.throws(() => openSpace(tmpSpace({ 'brief.md': '  \n' })), /no brief\.md/);
});

test('check: visuals and notes need a leading title sentence, steps after the first need a cue, sources stay under the cap', () => {
  const dir = tmpSpace({
    'brief.md': BRIEF,
    'visuals/a.html': '<svg></svg>',
    'visuals/b.html': '<!-- no sentence end -->\n<svg></svg>',
    'visuals/c.html': '<!-- Fine. Note. -->\n<g class="step"></g><g class="step"></g><g class="big step" data-cue="x"></g>',
    'notes/n.md': 'no comment at all',
    'sources/big.txt': 'x'.repeat(SOURCE_CAP - 10),
    'sources/small.txt': 'y'.repeat(20),
    'sources/image.png': 'PNG\0\0\0',
  });
  const { errors, warnings, sources } = readSpace(dir);
  assert.deepEqual(errors, [
    'visuals/a.html must open with <!-- Title sentence. Note to the mind --> (the first sentence is its title)',
    'visuals/b.html must open with <!-- Title sentence. Note to the mind --> (the first sentence is its title)',
    'visuals/c.html: step 2 has no data-cue (only the first step may go without)',
    'notes/n.md must open with <!-- what this note holds. -->',
    'sources/ is over the 100k character cap',
  ]);
  assert.deepEqual(sources.map(s => s.name), ['sources/big.txt']); // whole files, until the cap
  assert.equal(warnings.length, 2);
  assert.match(warnings.join('\n'), /image\.png looks binary/);
  assert.match(warnings.join('\n'), /small\.txt would take the sources past 100k/);
});

test('the notes the mind rewrote go under their own comments, and the notes as they were are kept in the session folder', () => {
  const dir = tmpSpace({ 'brief.md': BRIEF, 'notes/a.md': '<!-- Alpha. -->\n\nold a\n', 'notes/b.md': '<!-- Beta. -->\n\nold b\n' });
  const space = readSpace(dir), session = newSessionDir(dir);
  writeNotes(space, { a: ' new a ', b: '   ', c: 'no such note' }, session);
  assert.equal(readFileSync(join(dir, 'notes/a.md'), 'utf8'), '<!-- Alpha. -->\n\nnew a\n');
  assert.equal(readFileSync(join(dir, 'notes/b.md'), 'utf8'), '<!-- Beta. -->\n\nold b\n'); // an empty answer never wipes a note
  assert.equal(existsSync(join(dir, 'notes/c.md')), false);
  assert.equal(readFileSync(join(session, 'notes-before/a.md'), 'utf8'), '<!-- Alpha. -->\n\nold a\n');
  assert.deepEqual(readdirSync(join(dir, 'sessions')).length, 1);
});

test('sessions started in the same second, even by different processes, each get their own folder', async () => {
  const dir = tmpSpace({ 'brief.md': BRIEF }), at = Date.now() + 700; // all six wait for the same instant, then ask at once
  const code = `import { newSessionDir } from ${JSON.stringify(import.meta.resolve('../src/space.ts'))}; while (Date.now() < ${at}); console.log(newSessionDir(${JSON.stringify(dir)}))`;
  const made = await Promise.all(Array.from({ length: 6 }, () => new Promise<string>(done => execFile(process.execPath, ['--input-type=module', '-e', code], (_err, out) => done(out.trim())))));
  assert.equal(new Set(made).size, 6);
  assert.ok(made.every(p => existsSync(p)));
});

test('a rehearsal writes the new notes into its own session folder and leaves notes/ alone', () => {
  const dir = tmpSpace({ 'brief.md': BRIEF, 'notes/a.md': '<!-- Alpha. -->\n\nreal memory\n' });
  const space = readSpace(dir), session = newSessionDir(dir);
  writeNotes(space, { a: 'rehearsal result' }, session, false);
  assert.equal(readFileSync(join(dir, 'notes/a.md'), 'utf8'), '<!-- Alpha. -->\n\nreal memory\n');
  assert.equal(readFileSync(join(session, 'notes-after/a.md'), 'utf8'), '<!-- Alpha. -->\n\nrehearsal result\n');
  assert.equal(existsSync(join(session, 'notes-before')), false);
});

test("a day's spend counts this space's real sessions since midnight, not simulated ones; the last recap is the newest one", () => {
  const dir = tmpSpace({ 'brief.md': BRIEF });
  const now = new Date(), yesterday = new Date(now.getTime() - 30 * 3600_000);
  const session = (when: Date, extra: object, name: string) => {
    const path = join(dir, 'sessions', name);
    mkdirSync(path, { recursive: true });
    writeMeta(path, { id: name, started_at: when.toISOString(), cost_usd: 1.5, ...extra });
  };
  session(yesterday, { recap: { covered: ['old'], open: '' } }, '2026-01-01T10-00-00');
  session(now, {}, '2026-01-02T10-00-00');
  session(now, { sim: true }, '2026-01-02T11-00-00');
  session(now, { cost_usd: 2, recap: { covered: ['new'], open: 'q' } }, '2026-01-02T12-00-00');
  session(now, { sim: true, recap: { covered: ['rehearsal'], open: '' } }, '2026-01-02T13-00-00');
  assert.equal(spentToday(dir, now), 3.5);
  assert.deepEqual(lastRecap(dir), { covered: ['new'], open: 'q' }); // a rehearsal isn't last time
  assert.equal(readMeta(join(dir, 'sessions', '2026-01-02T12-00-00'))?.cost_usd, 2);
  assert.equal(lastRecap(tmpSpace({ 'brief.md': BRIEF })), null);
});
