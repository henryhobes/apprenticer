import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

// A space is a plain folder: brief.md, notes/, visuals/, sources/, and sessions/ (which the runtime
// owns). A leading HTML comment in any of its files is a note to the mind.
export interface Visual { id: string; title: string; when: string; html: string; looks?: string } // looks: what a drawing looks like, for the mind (kit.ts describe)
export interface Note { name: string; about: string; body: string }
export interface Source { name: string; text: string }
export interface Space { dir: string; title: string; brief: string; visuals: Visual[]; notes: Note[]; sources: Source[]; errors: string[]; warnings: string[] }
export interface Recap { covered: string[]; open: string }
export interface Meta { id: string; started_at: string; ended_at?: string; duration_s?: number; cost_usd: number; sim?: boolean; recap?: Recap; notes?: 'updated' | 'skipped' | 'preview' }

export const SOURCE_CAP = 100_000;
export const DEFAULT_MEMORY = 'What I know about this person and how our sessions have gone: who they are, what they want, how they like to work, what we covered, and what is still open.';

const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const names = (dir: string, ext: RegExp) => existsSync(dir) ? readdirSync(dir).filter(f => ext.test(f) && !f.startsWith('.')).sort() : [];

/** A file's leading HTML comment, which is its note to the mind, and the rest of the file. */
export function splitComment(text: string): { note: string; rest: string } {
  const m = text.match(/^\s*<!--([\s\S]*?)-->\s*/);
  return m ? { note: m[1].trim(), rest: text.slice(m[0].length) } : { note: '', rest: text };
}
/** A note's first sentence is its title; the rest is what it tells the mind. */
export const titled = (note: string) => /[.!?](\s|$)/.test(note);
const sentence = (note: string) => note.match(/^(.*?)[.!?](?:\s+([\s\S]*))?$/s) ?? [];

/** Text files under sources/, whole, in name order, until the cap; binaries and files that no longer fit are left out with a warning. */
export function readSources(dir: string): { sources: Source[]; warnings: string[]; over: boolean } {
  const root = join(dir, 'sources'), sources: Source[] = [], warnings: string[] = [];
  let used = 0, over = false;
  const files = existsSync(root) ? (readdirSync(root, { recursive: true }) as string[]).filter(p => !p.split('/').some(s => s.startsWith('.')) && statSync(join(root, p)).isFile()).sort() : [];
  for (const name of files) {
    const bytes = readFileSync(join(root, name));
    if (bytes.subarray(0, 8000).includes(0)) { warnings.push(`sources/${name} looks binary, so it is left out`); continue; }
    const text = bytes.toString('utf8').trim();
    if (used + text.length > SOURCE_CAP) { over = true; warnings.push(`sources/${name} would take the sources past ${SOURCE_CAP / 1000}k characters, so it is left out`); continue; }
    used += text.length;
    sources.push({ name: `sources/${name}`, text });
  }
  return { sources, warnings, over };
}

/**
 * Reads the whole space and never throws or writes: what is wrong with it comes back in `errors`
 * (what `apprenticer check` fails on) and `warnings`. The visuals are in filename order; the id is the
 * file's name, the title its note's first sentence, `when` the rest of the note.
 */
export function readSpace(path: string): Space {
  const dir = resolve(path), errors: string[] = [], brief = read(join(dir, 'brief.md')).trim();
  if (!brief) errors.push('brief.md is missing or empty');
  const visuals = names(join(dir, 'visuals'), /\.html$/).map(f => {
    const { note, rest } = splitComment(read(join(dir, 'visuals', f)));
    if (!titled(note)) errors.push(`visuals/${f} must open with <!-- Title sentence. Note to the mind --> (the first sentence is its title)`);
    const steps = [...rest.matchAll(/<[a-z][^>]*\bclass\s*=\s*["'][^"']*\bstep\b[^"']*["'][^>]*>/gi)].map(m => m[0]);
    steps.forEach((tag, i) => { if (i && !/\bdata-cue\s*=/.test(tag)) errors.push(`visuals/${f}: step ${i + 1} has no data-cue (only the first step may go without)`); });
    const [, title = f, when = ''] = sentence(note);
    return { id: f.replace(/\.html$/, ''), title, when, html: rest };
  });
  const notes = names(join(dir, 'notes'), /\.md$/).map(f => {
    const { note, rest } = splitComment(read(join(dir, 'notes', f)));
    if (!titled(note)) errors.push(`notes/${f} must open with <!-- what this note holds. -->`);
    return { name: f.replace(/\.md$/, ''), about: note, body: rest.trim() };
  });
  const { sources, warnings, over } = readSources(dir);
  if (over) errors.push(`sources/ is over the ${SOURCE_CAP / 1000}k character cap`);
  return { dir, brief, title: brief.match(/^#\s+(.+)$/m)?.[1].trim() ?? basename(dir), visuals, notes, sources, errors, warnings };
}

/** For a space that is about to be used: notes/memory.md is made if there are no notes, so there is always somewhere for the mind to remember. */
export function openSpace(path: string): Space {
  const dir = resolve(path);
  if (existsSync(join(dir, 'brief.md')) && !names(join(dir, 'notes'), /\.md$/).length) {
    mkdirSync(join(dir, 'notes'), { recursive: true });
    writeFileSync(join(dir, 'notes', 'memory.md'), `<!-- ${DEFAULT_MEMORY} -->\n`);
  }
  const space = readSpace(dir);
  if (!space.brief) throw new Error(`${dir} has no brief.md, or it is empty. \`apprenticer init ${path}\` makes a starting space.`);
  return space;
}

/**
 * Writes the notes the mind rewrote, each under its own comment; the notes as they were are kept in the
 * session folder. A rehearsal (`apply` false) writes them to the session folder's notes-after/ instead and leaves notes/ alone.
 */
export function writeNotes(space: Space, bodies: Record<string, string>, sessionDir: string, apply = true) {
  const out = apply ? join(space.dir, 'notes') : join(sessionDir, 'notes-after');
  if (apply && existsSync(out)) cpSync(out, join(sessionDir, 'notes-before'), { recursive: true });
  mkdirSync(out, { recursive: true });
  for (const n of space.notes) {
    const body = bodies[n.name]?.trim(); // an empty answer never wipes a note
    if (body) writeFileSync(join(out, `${n.name}.md`), `${n.about ? `<!-- ${n.about} -->\n\n` : ''}${body}\n`);
  }
}

// sessions/<local time>/ belongs to the runtime: events.jsonl, transcript.md, session.json, drawings/, notes-before/.
const stamp = (d = new Date()) => `${d.toLocaleDateString('en-CA')}T${d.toLocaleTimeString('en-GB').replace(/:/g, '-')}`;
/** A new session folder, named by the second it started; two starting in the same second (even in different processes) get a -2, -3... suffix, since mkdir without `recursive` fails if the folder exists. */
export function newSessionDir(dir: string): string {
  mkdirSync(join(dir, 'sessions'), { recursive: true });
  const name = stamp();
  for (let n = 1; ; n++) {
    const path = join(dir, 'sessions', n > 1 ? `${name}-${n}` : name);
    try { mkdirSync(path); return path; } catch (err: any) { if (err.code !== 'EEXIST') throw err; }
  }
}
export const sessionDirs = (dir: string) => names(join(dir, 'sessions'), /^\d{4}-/).map(f => join(dir, 'sessions', f));
export const readMeta = (sessionDir: string): Meta | null => existsSync(join(sessionDir, 'session.json')) ? JSON.parse(readFileSync(join(sessionDir, 'session.json'), 'utf8')) : null;
export const writeMeta = (sessionDir: string, meta: Meta) => writeFileSync(join(sessionDir, 'session.json'), JSON.stringify(meta, null, 2) + '\n');

/** What this space's real sessions cost since local midnight; simulated ones don't count. */
export function spentToday(dir: string, now = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return sessionDirs(dir).map(readMeta).reduce((sum, m) => m && !m.sim && Date.parse(m.started_at) >= midnight ? sum + m.cost_usd : sum, 0);
}

/** The newest real session's recap, for the "last time" line: a rehearsal isn't last time. */
export const lastRecap = (dir: string): Recap | null => sessionDirs(dir).reverse().map(readMeta).find(m => m?.recap && !m.sim)?.recap ?? null;
