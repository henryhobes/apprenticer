#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { config, packageFile, requireKey } from '../src/config.ts';
import { saveNotes } from '../src/session.ts';
import { createApp, createPreviewApp } from '../src/server.ts';
import { simulate } from '../src/sim.ts';
import { DEFAULT_MEMORY, openSpace, readMeta, readSpace, sessionDirs } from '../src/space.ts';

const USAGE = `apprenticer <dir>                    serve the space in <dir> on localhost and open it
apprenticer init <dir>               start a new space
apprenticer skill [dir]              install the skill that builds spaces, for Claude Code (default ~/.claude/skills/apprenticer)
apprenticer check <dir>              check a space's files (no key, no model)
apprenticer preview <dir>            serve and open only the visuals preview (no key)
apprenticer notes <dir> [session]    save the notes for a session whose notes pass failed
apprenticer sim <dir> --user <file.md> [--turns 10] [--out file] [--draw] [--notes | --no-notes] [--tier default]
                                     rehearse the space in text against a simulated user`;

const STUB_BRIEF = `# My space

<!-- Replace this stub: plain markdown, no front-matter, passed to the mind word for word. Say who the AI is, what the conversation is for, how it should behave and how long its turns are, and what it should remember. Ask your coding agent to write it with you. -->
`;

function init(path: string) {
  const dir = resolve(path);
  const make = (file: string, text: string | Buffer) => {
    const target = join(dir, file);
    if (existsSync(target)) return console.log(`kept ${file}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    console.log(`made ${file}`);
  };
  make('brief.md', STUB_BRIEF);
  make('notes/memory.md', `<!-- ${DEFAULT_MEMORY} -->\n`);
  make('visuals/.gitkeep', '');
  make('sources/.gitkeep', '');
  make('.gitignore', 'sessions/\n');
  make('AGENTS.md', GUIDE().replace(/^---\n[\s\S]*?\n---\n+/, '')); // the skill, as the guide any coding agent follows in the space
  make('CLAUDE.md', '@AGENTS.md\n');
  console.log(INTERVIEW(path));
}

const GUIDE = () => readFileSync(packageFile('skill/SKILL.md'), 'utf8');

// Printed by init, so the coding agent meets the interview as tool output, which it acts on at once: an
// agent that already had a plan, or works from another folder, treated AGENTS.md as a reference and skipped it.
const INTERVIEW = (path: string) => `
Not a coding agent? Open ${path} in one and tell it what you want to work on.

For the coding agent building this space: ${join(path, 'AGENTS.md')} is your instructions for it. Read all of it now, even if you already have a plan.

Interview the user first. Ask these one at a time, in your own words, and wait for each answer. Don't answer them yourself from context or from earlier in the conversation: you may put your guess as the question ("Sounds like X. Right?"), but the user answers every one.
1. What do you want to be able to do, when does it become real, and how long is a sitting?
2. What will actually happen in that moment? What do you expect to be asked, or to need?
3. Who are you in this: what do you know cold, and what's shaky?
4. Who should the AI be? A teacher; a specific person (what do they want, what worries them, what would win them over?); a thinking partner; something else.
5. What do you hate in conversations like this? Is there anything it should read?

Then write the brief and read it back to them in three to five lines. Write no visuals or persona until they say yes to that read-back; a review by another model is not their yes.

When it's built: apprenticer ${path}`;

/** Puts the skill where Claude Code finds it, so it starts with the interview wherever the user asks for a space. */
function installSkill(path = join(homedir(), '.claude', 'skills', 'apprenticer')) {
  const target = join(resolve(path), 'SKILL.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, GUIDE());
  console.log(`installed ${target}\nIn Claude Code, say what you want to prepare for or learn ("help me prepare for my interview on Thursday"), or type /apprenticer.`);
}

function check(path: string) {
  const space = readSpace(path);
  space.errors.forEach(e => console.log(`error: ${e}`));
  space.warnings.forEach(w => console.log(`warning: ${w}`));
  const chars = space.sources.reduce((n, s) => n + s.text.length, 0);
  console.log(`${space.title}: ${space.visuals.length} visuals, ${space.notes.length} notes, ${space.sources.length} sources (${Math.round(chars / 1000)}k characters)`);
  console.log(space.errors.length ? `${space.errors.length} to fix` : 'ok');
  process.exitCode = space.errors.length ? 1 : 0;
}

/** Listens on localhost, on the next free port if this one is taken. */
function listen(fetch: (r: Request) => Response | Promise<Response>, port: number, tries = 10): Promise<number> {
  return new Promise((done, fail) => {
    const server = serve({ fetch, port, hostname: '127.0.0.1' }, info => done(info.port));
    server.once('error', (err: NodeJS.ErrnoException) => err.code === 'EADDRINUSE' && tries > 1 ? done(listen(fetch, port + 1, tries - 1)) : fail(err));
  });
}

async function serveSpace(path: string, open: boolean, preview = false) {
  const space = preview ? readSpace(path) : openSpace(path); // a preview writes nothing and needs no key
  if (!preview) await requireKey();
  [...space.errors.map(e => `error: ${e}`), ...space.warnings.map(w => `warning: ${w}`)].forEach(m => console.warn(m));
  const port = await listen((preview ? createPreviewApp(space.dir) : createApp(space.dir)).fetch, config.port), url = `http://localhost:${port}${preview ? '/preview' : ''}`;
  console.log(`Apprenticer${preview ? ' preview' : ''}: ${path} ("${space.title}") → ${url}`);
  if (open) {
    const [cmd, ...args] = process.platform === 'darwin' ? ['open'] : process.platform === 'win32' ? ['cmd', '/c', 'start', ''] : ['xdg-open'];
    spawn(cmd, [...args, url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
}

async function notes(path: string, which?: string) {
  await requireKey();
  const dir = openSpace(path).dir, sessions = sessionDirs(dir);
  const target = which ? sessions.find(s => basename(s).startsWith(which))
    : [...sessions].reverse().find(s => [undefined, 'failed'].includes(readMeta(s)?.notes) && !readMeta(s)?.sim && existsSync(join(s, 'transcript.md')));
  if (!target || !existsSync(join(target, 'transcript.md'))) throw new Error(which ? `No session "${which}" with a transcript in ${dir}/sessions.` : 'Every session already has its notes.');
  const meta = await saveNotes(dir, target);
  console.log(meta.notes === 'skipped' ? `${basename(target)}: too short to keep notes` : `${basename(target)}: notes updated${meta.recap ? `\n${meta.recap.covered.map(c => `  - ${c}`).join('\n')}` : ''}`);
}

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    user: { type: 'string' }, turns: { type: 'string' }, out: { type: 'string' }, tier: { type: 'string' }, help: { type: 'boolean', short: 'h' },
    draw: { type: 'boolean' }, notes: { type: 'boolean' }, 'no-notes': { type: 'boolean' }, 'no-open': { type: 'boolean' } } });
  const [cmd, dir, extra] = ['init', 'check', 'notes', 'sim', 'preview', 'skill'].includes(positionals[0]) ? positionals : ['serve', ...positionals];
  if (cmd === 'skill' && !values.help) installSkill(dir);
  else if (values.help || !dir) console.log(USAGE);
  else if (cmd === 'init') init(dir);
  else if (cmd === 'check') check(dir);
  else if (cmd === 'preview') await serveSpace(dir, !values['no-open'], true);
  else if (cmd === 'notes') await notes(dir, extra);
  else if (cmd === 'sim') {
    if (!values.user) throw new Error('sim needs --user <file.md>: who the simulated user is, how they talk, what they will do.');
    await requireKey();
    config.mindTier = (values.tier ?? 'default') as typeof config.mindTier; // a rehearsal doesn't need the 6x tier; --tier ultrafast for real latencies
    await simulate(dir, { user: values.user, turns: Number(values.turns ?? 10), out: values.out, draw: !!values.draw, notes: values['no-notes'] ? 'skip' : values.notes ? 'apply' : 'preview' });
  } else await serveSpace(dir, !values['no-open']);
} catch (err: any) {
  console.error(err.message);
  process.exitCode = 1;
}
