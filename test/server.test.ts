import { STEPS, tmpSpace } from './setup.ts';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as board from '../src/board.ts';
import { createApp } from '../src/server.ts';
import { writeMeta } from '../src/space.ts';

const local = { headers: { host: 'localhost:8787' } };
const post = (app: ReturnType<typeof createApp>, body: object = { sdp: 'offer' }) =>
  app.request('/api/session', { method: 'POST', body: JSON.stringify(body), headers: { host: 'localhost:8787', 'content-type': 'application/json' } });

function setup(files: Record<string, string> = {}) {
  const dir = tmpSpace({ 'brief.md': '# Coach\n\nCoach me.', 'visuals/01-steps.html': STEPS, ...files });
  const created: any[] = [], ran: string[] = [];
  let finish!: () => void;
  const client = { live: { create: async (body: any) => { created.push(body); return { session: { id: 'live_1' }, transport: { sdp: 'answer', type: 'webrtc' } }; } } } as any;
  const app = createApp(dir, client, (_dir, id) => { ran.push(id); return new Promise<void>(r => { finish = r; }); });
  return { dir, app, created, ran, finish: () => finish() };
}

test('the page, the space and the preview are served to localhost; any other host is refused', async () => {
  const { app } = setup();
  const page = await app.request('/', local);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>Apprenticer<\/title>/);
  const space = await (await app.request('/api/space', local)).json();
  assert.deepEqual(space.title, 'Coach');
  assert.equal(space.last, null);
  const preview = await (await app.request('/preview', local)).text();
  assert.match(preview, /<title>Coach · visuals<\/title>/);
  assert.match(preview, /Three steps/);
  assert.match(preview, /<code>set play<\/code>/); // the move its note names
  assert.match(preview, /Type what&#39;s said|Type what's said/);
  assert.equal((await app.request('/', { headers: { host: 'evil.example' } })).status, 404);
  assert.equal((await app.request('/api/session', { method: 'POST', headers: { host: 'evil.example:8787' } })).status, 404);
  assert.match(await (await createApp(tmpSpace({ 'brief.md': '# Empty' }), {} as any).request('/preview', local)).text(), /no visuals yet/);
});

test('a session is created over WebRTC with the voice settings, one at a time until its notes are saved', async () => {
  const { app, created, ran, finish } = setup();
  const res = await post(app);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { sdp: 'answer', session_id: 'live_1' });
  assert.equal(created[0].transport.sdp, 'offer');
  assert.equal(created[0].session.model, 'gpt-live-1');
  assert.equal(created[0].session.delegation.type, 'client');
  assert.match(created[0].session.instructions, /Don't speak first/);
  assert.deepEqual(ran, ['live_1']);
  const second = await post(app);
  assert.equal(second.status, 409);
  assert.match((await second.json()).error, /saving the notes/);
  finish();
  await new Promise(r => setTimeout(r, 10));
  assert.equal((await post(app)).status, 200); // free again
});

test("today's limit stops a new session, and a space with no brief is refused", async () => {
  const { app, dir, ran } = setup();
  const path = join(dir, 'sessions', '2026-01-01T10-00-00');
  mkdirSync(path, { recursive: true });
  writeMeta(path, { id: 'x', started_at: new Date().toISOString(), cost_usd: 25 });
  const res = await post(app);
  assert.equal(res.status, 429);
  assert.match((await res.json()).error, /limit is reached/);
  assert.deepEqual(ran, []);
  const bare = await post(createApp(tmpSpace({}), {} as any, async () => {}));
  assert.equal(bare.status, 500);
  assert.match((await bare.json()).error, /no brief\.md/);
});

test('the board streams as JSON lines, replaying what is up to a page that opens late', async t => {
  const { app } = setup();
  board.start();
  t.after(board.end);
  board.apply([{ verb: 'ask', arg: 'Ready?' }], '', []);
  const res = await app.request('/api/board', local);
  assert.equal(res.headers.get('content-type'), 'application/x-ndjson');
  const reader = res.body!.getReader();
  const { value } = await reader.read();
  assert.deepEqual(JSON.parse(new TextDecoder().decode(value)), { type: 'ask', question: 'Ready?', replay: true });
  await reader.cancel();
});
