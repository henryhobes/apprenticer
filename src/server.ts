import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { readFileSync } from 'node:fs';
import type OpenAI from 'openai';
import * as board from './board.ts';
import { config, openai } from './config.ts';
import { previewPage } from './preview.ts';
import { runSession, voiceSession } from './session.ts';
import { lastRecap, openSpace, readSpace, spentToday } from './space.ts';

export const page = () => readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

/** The app for one space, on localhost only: the page, the WebRTC handshake, the board stream and the visuals preview. `run` is the session, replaced in tests. */
export function createApp(dir: string, client: OpenAI = openai(), run = runSession) {
  const app = new Hono();
  let busy = false; // a session, and then the saving of its notes, is under way: a new one would start on stale notes

  // No key and no login: this is for the one person at this computer. Refusing any other Host also
  // keeps a web page elsewhere from reaching it through DNS rebinding.
  app.use(async (c, next) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(c.req.header('host') ?? '') ? next() : c.text('not found', 404));

  app.get('/', c => c.html(page()));
  app.get('/api/space', c => { const space = readSpace(dir); return c.json({ title: space.title, dir: space.dir, last: lastRecap(space.dir) }); });

  // The session in the browser over WebRTC: the server creates it, then runs the mind on its own connection.
  app.post('/api/session', async c => {
    if (busy) return c.json({ error: 'A session is still running or saving its notes. Try again in a minute.' }, 409);
    busy = true;
    try {
      openSpace(dir); // refuses a space with no brief
      if (spentToday(dir) >= config.dailyCapUsd) throw Object.assign(new Error(`Today's $${config.dailyCapUsd} limit is reached.`), { status: 429 });
      const { sdp } = await c.req.json<{ sdp: string }>();
      const live = await client.live.create({ session: voiceSession(), transport: { type: 'webrtc', sdp } });
      const id = live.session.id;
      run(dir, id).catch(err => console.error(`[${id}] session failed`, err)).finally(() => { busy = false; });
      console.log(`[${id}] session started`);
      return c.json({ sdp: live.transport.sdp, session_id: id });
    } catch (err: any) {
      busy = false;
      return c.json({ error: err.message }, err.status === 429 ? 429 : 500);
    }
  });

  // The board, as a stream of JSON lines for whichever session is live. A blank line every 15 s keeps a quiet stream open.
  app.get('/api/board', c => {
    c.header('content-type', 'application/x-ndjson');
    c.header('cache-control', 'no-store');
    return stream(c, async out => {
      const unsubscribe = board.subscribe(e => { out.write(JSON.stringify(e) + '\n'); });
      const ping = setInterval(() => out.write('\n'), 15_000);
      await new Promise<void>(resolve => out.onAbort(resolve));
      clearInterval(ping);
      unsubscribe();
    });
  });

  // Every visual of the space on its own board, to check them without a session; read afresh each time.
  app.get('/preview', c => c.html(previewPage(readSpace(dir), page())));

  return app;
}
