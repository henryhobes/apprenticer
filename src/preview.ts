import type { Space } from './space.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

// Inside each board, as on the real one: parts come up one at a time or as their cue words are typed;
// with its labels off, a label comes back when it's named.
const helper = `<script>
(() => {
  const steps = [...document.querySelectorAll('.step')];
  let said = '';
  const lit = n => steps.forEach((s, i) => { if (i <= n) s.classList.add('on'); });
  const hears = (cues, text) => cues.split('|').some(c => c.trim() && new RegExp('\\\\b' + c.trim().replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'i').test(text));
  lit(0);
  addEventListener('message', e => {
    const d = e.data || {};
    if (d.cmd === 'next') lit(steps.findIndex(s => !s.classList.contains('on')));
    if (d.cmd === 'all') lit(steps.length - 1);
    if (d.cmd === 'said') {
      said += ' ' + d.text;
      steps.forEach((s, i) => { if (s.dataset.cue && hears(s.dataset.cue, said)) lit(i); });
      if (document.body.classList.contains('labels-off'))
        document.querySelectorAll('.label[data-cue]').forEach(l => { if (hears(l.dataset.cue, said)) l.classList.add('named'); });
    }
    const labels = String(d.set || '').match(/^labels\\s+(on|off)$/);
    if (labels) { document.body.classList.toggle('labels-off', labels[1] === 'off'); document.querySelectorAll('.label').forEach(l => l.classList.remove('named')); said = ''; }
  });
})();
</script>`;

/**
 * Every visual of the space on its own board, close to how the person sees it, with its note, a button for each
 * move the note names ("set play", ...), and a line to type what's said. `index` is the app's page,
 * which carries the base styles every visual is drawn on.
 */
export function previewPage(space: Space, index: string): string {
  const base = index.match(/<template id="base">([\s\S]*?)<\/template>/)![1];
  const boards = space.visuals.map(v => {
    const named = [...new Set([...v.when.matchAll(/"set ([^"]+)"/g)].map(m => m[1]))];
    const moves = named.filter(m => !named.some(o => o.startsWith(`${m} `))); // "set bet" alone is a reminder; "set bet billion" is the move
    const doc = `<!doctype html><meta charset="utf-8"><meta name="color-scheme" content="dark">${base}${v.html}${helper}`;
    return `<section class="board" id="v${esc(v.id)}">
  <header><span class="id">${esc(v.id)}</span><h2>${esc(v.title)}</h2></header>
  <div class="frame"><iframe title="${esc(v.title)}" srcdoc="${esc(doc)}"></iframe></div>
  <div class="controls">
    <button data-cmd="next">Next part</button><button data-cmd="all">All parts</button><button data-cmd="reset">Start over</button>
    ${moves.map(m => `<button data-set="${esc(m)}"><code>set ${esc(m)}</code></button>`).join('')}
    <form><input placeholder="Type what's said, then Enter" aria-label="Words said"></form>
  </div>
  <p class="note"><b>The note to the mind.</b> ${esc(v.when) || '(none)'}</p>
</section>`;
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(space.title)} · visuals</title>
<style>
  :root { --bg:#0B0C0E; --board:#111214; --ink:#ECE9E3; --dim:#8A8780; --line:#2A2B30; --gold:#D9A441; color-scheme: dark; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; padding:32px max(16px, 4vw) 64px; }
  main { max-width:1100px; margin:0 auto; display:flex; flex-direction:column; gap:56px; }
  .intro h1 { margin:0 0 6px; font-size:26px; font-weight:600; }
  .intro p { margin:0; color:var(--dim); max-width:65ch; }
  .board { display:flex; flex-direction:column; gap:14px; }
  .board header { display:flex; align-items:baseline; gap:12px; }
  .board h2 { margin:0; font-size:19px; font-weight:600; }
  .id { color:var(--dim); font:13px ui-monospace, Menlo, monospace; }
  .frame { position:relative; width:100%; aspect-ratio:1200/750; background:var(--board); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .frame iframe { position:absolute; left:0; top:0; width:1200px; height:750px; border:0; transform-origin:0 0; background:transparent; }
  .controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  button { font:inherit; font-size:14px; color:var(--ink); background:#1C1D20; border:1px solid var(--line); border-radius:6px; padding:7px 12px; cursor:pointer; }
  button:hover { border-color:var(--dim); }
  button:focus-visible, input:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }
  button[data-set] { border-color:#3B3320; }
  button code { font:13px ui-monospace, Menlo, monospace; }
  form { flex:1 1 280px; min-width:0; }
  input { width:100%; box-sizing:border-box; font:inherit; font-size:14px; color:var(--ink); background:#16171A; border:1px solid var(--line); border-radius:6px; padding:8px 12px; }
  .note { margin:0; color:var(--dim); font-size:14px; max-width:85ch; }
  .note b { color:var(--ink); font-weight:600; }
</style></head>
<body><main>
  <div class="intro"><h1>${esc(space.title)} · visuals</h1>
    <p>${space.visuals.length ? 'Each board is a close copy of what the person sees (the real page also staggers the parts and brings up any that were never named after 8 seconds). Parts come up as the mind names them: use Next part, or type the words. The gold-edged buttons are the moves the mind can make. Reload after editing a visual.' : 'This space has no visuals yet. Add files to visuals/ and reload.'}</p></div>
  ${boards.join('\n  ')}
</main>
<script>
const fit = () => document.querySelectorAll('.frame').forEach(f => f.firstElementChild.style.transform = \`scale(\${f.clientWidth / 1200})\`);
addEventListener('resize', fit); fit();
document.querySelectorAll('.board').forEach(board => {
  const send = msg => board.querySelector('iframe').contentWindow.postMessage(msg, '*');
  board.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cmd === 'reset') { const f = board.querySelector('iframe'); f.replaceWith(f.cloneNode()); fit(); }
    else if (b.dataset.cmd) send({ cmd: b.dataset.cmd });
    else send({ set: b.dataset.set });
  });
  board.querySelector('form').addEventListener('submit', e => {
    e.preventDefault(); const i = e.target.querySelector('input');
    if (i.value.trim()) send({ cmd: 'said', text: i.value }); i.value = '';
  });
});
</script></body></html>`;
}
