import './setup.ts';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { packageFile } from '../src/config.ts';
import { moves } from '../src/preview.ts';
import { buildSite, sitePage } from '../src/site.ts';
import { readSpace } from '../src/space.ts';

const SPACE = packageFile('examples/what-is-a-gpu');
const unesc = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

test('docs/ is the showcase as built from the space now: after changing the space, run npm run site', () => {
  const out = mkdtempSync(join(tmpdir(), 'apprenticer-site-'));
  buildSite(out);
  const docs = packageFile('docs');
  assert.deepEqual(readdirSync(docs).sort(), readdirSync(out).sort());
  for (const f of readdirSync(out)) assert.equal(readFileSync(join(docs, f), 'utf8'), readFileSync(join(out, f), 'utf8'), `docs/${f} is out of date: run npm run site`);
});

test('the showcase puts up every visual of the space with its moves, and quotes the brief only word for word', () => {
  const page = sitePage(), space = readSpace(SPACE);
  for (const v of space.visuals) {
    assert.ok(page.includes(`id="v${v.id}"`), `${v.id} is on the page`);
    for (const m of moves(v)) assert.ok(page.includes(`data-set="${m}"`), `${v.id} has a button for set ${m}`);
  }
  assert.match(page, /data-set="labels on"/); // labels off would leave them hidden, with no one to name them
  const quotes = [...page.matchAll(/<(q|blockquote) class="brief">([\s\S]*?)<\/\1>/g)].map(m => unesc(m[2]));
  assert.ok(quotes.length >= 10);
  for (const text of quotes) assert.ok(space.brief.includes(text), `not in brief.md: ${text}`);
  assert.doesNotMatch(page, /\b(src|href)="\/(?!\/)/); // nothing from the root: Pages serves it under /apprenticer/
  assert.doesNotMatch(page, /<(script|link|img)[^>]+(src|href)="https?:/); // nothing loaded from anywhere
});
