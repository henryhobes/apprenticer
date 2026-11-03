#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { config, requireKey } from '../src/config.ts';
import { saveNotes } from '../src/session.ts';
import { createApp } from '../src/server.ts';
import { simulate } from '../src/sim.ts';
import { DEFAULT_MEMORY, openSpace, readMeta, readSpace, sessionDirs } from '../src/space.ts';

const USAGE = `apprenticer <dir>                    serve the space in <dir> on localhost and open it
apprenticer init <dir>               start a new space
apprenticer check <dir>              check a space's files (no key, no model)
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
  const agents = new URL('../template/AGENTS.md', import.meta.url); // the guide a coding agent follows to build the space
  if (existsSync(agents)) { make('AGENTS.md', readFileSync(agents)); make('CLAUDE.md', '@AGENTS.md\n'); }
  console.log(`\nOpen ${path} in your coding agent and tell it what you want to work on: it writes the brief, visuals and sources.\nThen: apprenticer ${path}`);
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

async function serveSpace(path: string, open: boolean) {
  const space = openSpace(path);
  await requireKey();
  [...space.errors.map(e => `error: ${e}`), ...space.warnings.map(w => `warning: ${w}`)].forEach(m => console.warn(m));
  const port = await listen(createApp(space.dir).fetch, config.port), url = `http://localhost:${port}`;
  console.log(`Apprenticer: ${path} ("${space.title}") → ${url}`);
  if (open) {
    const [cmd, ...args] = process.platform === 'darwin' ? ['open'] : process.platform === 'win32' ? ['cmd', '/c', 'start', ''] : ['xdg-open'];
    spawn(cmd, [...args, url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
}

async function notes(path: string, which?: string) {
  await requireKey();
  const dir = openSpace(path).dir, sessions = sessionDirs(dir);
  const target = which ? sessions.find(s => basename(s).startsWith(which))
    : [...sessions].reverse().find(s => !readMeta(s)?.notes && !readMeta(s)?.sim && existsSync(join(s, 'transcript.md')));
  if (!target || !existsSync(join(target, 'transcript.md'))) throw new Error(which ? `No session "${which}" with a transcript in ${dir}/sessions.` : 'Every session already has its notes.');
  const meta = await saveNotes(dir, target);
  console.log(meta.notes === 'skipped' ? `${basename(target)}: too short to keep notes` : `${basename(target)}: notes updated${meta.recap ? `\n${meta.recap.covered.map(c => `  - ${c}`).join('\n')}` : ''}`);
}

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    user: { type: 'string' }, turns: { type: 'string' }, out: { type: 'string' }, tier: { type: 'string' }, help: { type: 'boolean', short: 'h' },
    draw: { type: 'boolean' }, notes: { type: 'boolean' }, 'no-notes': { type: 'boolean' }, 'no-open': { type: 'boolean' } } });
  const [cmd, dir, extra] = ['init', 'check', 'notes', 'sim'].includes(positionals[0]) ? positionals : ['serve', ...positionals];
  if (values.help || !dir) console.log(USAGE);
  else if (cmd === 'init') init(dir);
  else if (cmd === 'check') check(dir);
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
