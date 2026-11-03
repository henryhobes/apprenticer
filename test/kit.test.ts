import './setup.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Item, cues, fit, render } from '../src/kit.ts';

const item = (label: string, more: Partial<Item> = {}): Item => ({ label, value: null, unit: null, sub: null, dim: false, colour: 'ink', from: null, op: null, ...more });
const steps = (html: string) => [...html.matchAll(/<g class="step"(?: data-cue="([^"]*)")?>/g)].map(m => m[1] ?? '');
const golds = (html: string) => html.split('<g class="step"').filter(part => part.includes('var(--gold)')).length; // parts with gold in them

test("each part's cue words are its own, so saying one lights that part and no other", () => {
  assert.deepEqual(cues(['Order intake', 'Warehouse picking', 'Courier handoff packaging of the order']), ['intake', 'warehouse|picking', 'courier|handoff|packaging']);
});

test('text that is too long for its box shrinks, then is cut with an ellipsis', () => {
  assert.deepEqual(fit('Supported load', 30, 600), { lines: ['Supported load'], size: 30 });
  const cut = fit('Equity, business cash, or corporate borrowing before any lease is signed', 22, 200, 1);
  assert.equal(cut.lines.length, 1);
  assert.ok(cut.lines[0].endsWith('…') && cut.size >= 18);
});

test('a chain builds box by box with cues, merges two inputs into one box, and lights one thing gold', () => {
  const html = render({ type: 'chain', gold: null, note: 'roles, not contracts', columns: null, svg: null, items: [
    item('Customer order'), item('Warehouse picking'), item('Carrier booking', { from: [] }), item('Courier handoff', { from: [1, 2] }), item('Delivery')] });
  assert.deepEqual(steps(html), ['customer|order', 'warehouse|picking', 'carrier|booking', 'courier|handoff', 'delivery', '']); // the note comes last, uncued
  assert.equal((html.match(/<path class="draw"[^>]* C/g) ?? []).length, 4); // four curved arrows, two of them into the handoff
  assert.equal(golds(html), 1); // the end of the chain, by default
  // Picking and booking share a column (one x), stacked: the merge is two lines into one box.
  const x = (label: string) => html.match(new RegExp(`<rect x="([\\d.]+)"[^>]*/><text x="[\\d.]+" y="[\\d.]+"[^>]*><tspan[^>]*>${label}`))?.[1];
  assert.equal(x('Warehouse picking'), x('Carrier booking'));
});

test('a straight run of four or more reads top to bottom', () => {
  const html = render({ type: 'chain', gold: 'Signed lease', note: null, columns: null, svg: null, items: ['Early money', 'Site work', 'Signed lease', 'Financing', 'Construction'].map(l => item(l)) });
  assert.equal((html.match(/<rect x="240"/g) ?? []).length, 5);
  assert.equal(golds(html), 1);
});

test('numbers, compare, calc and split each draw, with one gold element', () => {
  const n = (label: string, value: string, unit: string, op: string | null = null) => item(label, { value, unit, op });
  const specs = [
    { type: 'numbers' as const, items: [n('Team size', '12', 'people'), n('Cycle', '40', 'days')], columns: null },
    { type: 'compare' as const, items: null, columns: [{ heading: 'Build', dim: false, items: [n('Field hours', '12,000', 'h')] }, { heading: 'Buy', dim: true, items: [n('Field hours', '4,500', 'h')] }] },
    { type: 'calc' as const, items: [n('Orders', '12,000', 'a day'), n('Per courier', '40', 'a day', '÷'), n('Couriers', '300', 'people', '=')], columns: null },
    { type: 'split' as const, items: [n('Budget', '1.3', 'M'), n('People', '1', 'M'), n('Tools', '0.22', 'M'), n('Other', '0.08', 'M')], columns: null },
  ];
  for (const spec of specs) {
    const html = render({ ...spec, gold: spec.type === 'compare' ? 'Buy' : null, note: null, svg: null });
    assert.match(html, /^<svg viewBox="0 0 1200 750"/, spec.type);
    assert.equal(golds(html), 1, spec.type);
    assert.ok(steps(html).length >= 2, spec.type);
  }
});

test('big numbers shrink together to fit their cells', () => {
  const n = (label: string, value: string) => item(label, { value, unit: 'hours / month' });
  const html = render({ type: 'numbers', gold: null, note: null, columns: null, svg: null, items: [n('Build', '12,000'), n('Buy', '4,500'), n('Hybrid', '8,000'), n('Target', '3,000')] });
  const sizes = [...html.matchAll(/<text [^>]*font-size="(\d+)" text-anchor="middle">[\d,]+<tspan/g)].map(m => Number(m[1]));
  assert.equal(sizes.length, 4);
  assert.ok(sizes.every(s => s === sizes[0] && s < 68)); // one size for all four, smaller than the 68 px four would get if they fit
});

test("a comparison's gold falls on the column that isn't dim", () => {
  const html = render({ type: 'compare', gold: null, note: null, items: null, svg: null,
    columns: [{ heading: 'Forecast', dim: true, items: [item('2027 additions')] }, { heading: 'Observed', dim: false, items: [item('40 campuses')] }] });
  const [, forecast, observed] = html.split('<g class="step"');
  assert.ok(!forecast.includes('var(--gold)') && observed.includes('var(--gold)'));
});

test("hand-written svg passes through; a spec with nothing to draw draws nothing", () => {
  assert.equal(render({ type: 'svg', gold: null, note: null, items: null, columns: null, svg: '<svg></svg>' }), '<svg></svg>');
  assert.equal(render({ type: 'chain', gold: null, note: null, items: [], columns: null, svg: null }), '');
});
