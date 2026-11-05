import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { packageFile } from './config.ts';
import { baseStyles, boardDoc, esc, moves } from './preview.ts';
import { readSpace, type Space } from './space.ts';

// The showcase page for GitHub Pages (docs/): what Apprenticer is, told through the what-is-a-gpu space.
// No live AI. The boards are the space's own visuals, built from it by `npm run site`; every line in a
// .brief quote is in brief.md word for word (a test holds both to that).

const SPACE = packageFile('examples/what-is-a-gpu');
const REPO = 'https://github.com/henryhobes/apprenticer';
const TREE = `${REPO}/tree/master/examples/what-is-a-gpu`;

const q = (s: string) => `<q class="brief">${esc(s)}</q>`;
const quote = (s: string) => `<blockquote class="brief">${esc(s)}</blockquote>`;

/** The lesson's beats, as the brief's arc gives them, each with the board it puts up. */
const BEATS = [
  { head: 'Lanes, 0 to 6 minutes', visual: '01-lanes',
    say: `It opens on this board and a prediction:`, ask: 'Two chips. On the left, a server processor: ninety-six cores, each thinking for itself. On the right, an AI chip: almost seventeen thousand lanes that must all take the same step together. Give both the same pile of work, split into a hundred different kinds of job. Which finishes first?',
    then: `Then the moves answer it. <code>set mixed</code>: a hundred kinds of job, and the lanes can only do one kind at a time, so it's about even. <code>set same</code>: one kind of work, and the GPU takes one tick.` },
  { head: 'Matrix multiply, 6 to 10 minutes', visual: '02-matmul',
    say: `Each answer cell is one row times one column, and no cell waits on any other. The prediction:`, ask: 'If every cell got its own lane, how long would all sixty-four take, compared with one cell?',
    then: `<code>set all</code> lights every cell at once and brings up the real size. AI is almost all this one shape of work.` },
  { head: 'Memory, 10 to 14 minutes', visual: '03-roofline',
    say: `Lanes can only work on numbers that have arrived from memory: the roofline shows both limits and the ridge where they meet. After <code>set matmul</code>:`, ask: 'At that dot, what is the chip waiting on: memory or arithmetic?',
    then: `The same board comes back in the next beat for <code>set chatbot</code> and <code>set batch</code>, and in the close with <code>set labels off</code>: their buttons are here.` },
  { head: 'The chatbot, 14 to 18 minutes', visual: '04-chatbot',
    say: `Every token a chatbot writes reads all of its weights from memory. The prediction:`, ask: 'If each weight took one byte instead of two, what happens to the speed?',
    then: `<code>set int8</code>: twice as fast with no extra arithmetic. Then back to <a href="#v03-roofline">the roofline</a>: <code>set chatbot</code> puts the dot at a fraction of a percent of peak, and <code>set batch</code> slides it up to the ridge, because one read of the weights serves every user in the batch.` },
];

/** What each part of a space is, for the folder listing. */
const PARTS: Record<string, string> = {
  'brief.md': 'who the tutor is, the goal, the arc, the rules. Given to the mind word for word',
  'notes/': 'its memory of Alex, rewritten after every session',
  'visuals/': 'the four boards below',
  'sources/': 'the facts every number comes from',
  'persona.md': 'a simulated Alex, for rehearsing the space in text with apprenticer sim',
};

function folder(): string {
  const dir = SPACE;
  const files = readdirSync(dir, { recursive: true, withFileTypes: true }).filter(d => d.isFile())
    .map(d => relative(dir, join(d.parentPath, d.name))).filter(f => !f.split('/').some(p => p.startsWith('.') || p === 'sessions')).sort();
  let seen = '';
  return files.map(f => {
    const top = f.includes('/') ? `${f.split('/')[0]}/` : f, first = top !== seen;
    seen = top;
    return `<li><a href="${TREE}/${esc(f)}"><code>${esc(f)}</code></a>${first && PARTS[top] ? `<span>${esc(PARTS[top])}</span>` : ''}</li>`;
  }).join('\n      ');
}

function board(space: Space, id: string, base: string): string {
  const v = space.visuals.find(v => v.id === id);
  if (!v) throw new Error(`${id} is not in ${space.dir}/visuals`);
  const own = moves(v), all = own.includes('labels off') ? [...own, 'labels on'] : own;
  return `<figure class="board" id="v${esc(v.id)}">
        <div class="frame"><iframe title="${esc(v.title)}" srcdoc="${esc(boardDoc(base, v))}"></iframe></div>
        <figcaption><span>${esc(v.title)}</span> <a href="${TREE}/visuals/${esc(v.id)}.html"><code>visuals/${esc(v.id)}.html</code></a></figcaption>
        <div class="controls">${all.map(m => `<button data-set="${esc(m)}"><code>set ${esc(m)}</code></button>`).join('')}<button data-cmd="reset">Start over</button></div>
      </figure>`;
}

export function sitePage(): string {
  const space = readSpace(SPACE), base = baseStyles(readFileSync(packageFile('public/index.html'), 'utf8'));
  const beats = BEATS.map((b, i) => `<article class="beat">
      <h3><span>${i + 1}</span> ${esc(b.head)}</h3>
      <p>${b.say}</p>
      ${quote(b.ask)}
      ${board(space, b.visual, base)}
      <p>${b.then}</p>
    </article>`).join('\n    ');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Apprenticer: ${esc(space.title)}</title>
<meta name="description" content="Apprenticer: talk to an AI by voice, with a board beside it. A 20-minute lesson on why AI runs on GPUs, and its real boards.">
<link rel="icon" href="data:,">
<style>
  :root { --bg:#0B0C0E; --board:#111214; --ink:#ECE9E3; --dim:#8A8780; --line:#2A2B30; --panel:#1C1D20; --gold:#D9A441; color-scheme:dark; }
  body { margin:0; background:var(--bg); color:var(--ink); font:17px/1.6 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; padding:56px max(20px, 5vw) 80px; }
  main { max-width:960px; margin:0 auto; }
  a { color:var(--ink); text-decoration-color:var(--dim); text-underline-offset:3px; }
  a:hover { text-decoration-color:var(--gold); }
  h1 { margin:0; font-size:44px; font-weight:600; letter-spacing:-.01em; }
  h2 { margin:88px 0 12px; font-size:28px; font-weight:600; }
  h3 { margin:0 0 8px; font-size:21px; font-weight:600; display:flex; gap:12px; align-items:baseline; }
  h3 span { color:var(--dim); font:15px ui-monospace, Menlo, monospace; }
  p, li { max-width:68ch; }
  p { margin:0 0 14px; }
  .lede { font-size:21px; line-height:1.5; margin:14px 0 22px; }
  .dim { color:var(--dim); }
  code { font:.86em ui-monospace, Menlo, monospace; }
  .facts { list-style:none; padding:0; margin:28px 0; display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:14px; max-width:none; }
  .facts li { background:var(--panel); border-radius:8px; padding:16px 18px; font-size:15px; line-height:1.5; }
  .facts b { display:block; font-size:16px; margin-bottom:4px; }
  q.brief { quotes:'\\201C' '\\201D'; }
  q.brief::before, q.brief::after { color:var(--gold); }
  blockquote.brief { margin:16px 0 20px; padding:2px 0 2px 20px; border-left:3px solid var(--gold); font-size:19px; line-height:1.5; max-width:62ch; }
  .key { font-size:14px; color:var(--dim); }
  .key i { font-style:normal; border-left:3px solid var(--gold); padding-left:8px; }
  .arc { list-style:none; padding:0; margin:20px 0 28px; display:grid; gap:6px; max-width:none; }
  .arc li { display:grid; grid-template-columns:7.5em 1fr; gap:12px; max-width:none; }
  .arc .t { color:var(--dim); font-variant-numeric:tabular-nums; }
  .bar { display:flex; height:6px; border-radius:3px; overflow:hidden; gap:2px; margin:8px 0 28px; max-width:none; }
  .bar i { background:#3A3B40; }
  .bar i:last-child { background:var(--gold); }
  .beat { margin:56px 0 0; }
  .board { margin:18px 0 16px; }
  .frame { position:relative; width:100%; aspect-ratio:1200/750; background:var(--board); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .frame iframe { position:absolute; left:0; top:0; width:1200px; height:750px; border:0; transform-origin:0 0; background:transparent; }
  figcaption { margin:10px 0 10px; font-size:14px; color:var(--dim); display:flex; flex-wrap:wrap; gap:4px 12px; }
  figcaption span { color:var(--ink); }
  .controls { display:flex; flex-wrap:wrap; gap:8px; }
  button { font:inherit; font-size:15px; color:var(--ink); background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:9px 14px; cursor:pointer; }
  button:hover { border-color:var(--dim); }
  button:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }
  button[data-set] { border-color:#5A4A26; }
  button[data-cmd] { color:var(--dim); }
  .folder { list-style:none; padding:0; margin:16px 0; font-size:15px; }
  .folder li { display:flex; flex-wrap:wrap; gap:2px 14px; padding:3px 0; max-width:none; }
  .folder span { color:var(--dim); }
  pre { background:var(--panel); border-radius:8px; padding:16px 18px; overflow-x:auto; font-size:15px; line-height:1.7; margin:16px 0 20px; }
  pre .c { color:var(--dim); }
  footer { margin-top:88px; padding-top:20px; border-top:1px solid var(--line); font-size:14px; color:var(--dim); }
  @media (max-width:600px) {
    body { padding:36px 16px 64px; font-size:16px; }
    h1 { font-size:34px; } .lede { font-size:18px; } h2 { margin-top:64px; }
    .frame { margin:0 -16px; width:calc(100% + 32px); border-radius:0; border-left:0; border-right:0; }
    .arc li { grid-template-columns:1fr; gap:0; }
  }
</style></head>
<body><main>
  <header>
    <h1>Apprenticer</h1>
    <p class="lede">Talk to an AI about anything, by voice, in your browser, with a board beside it that shows what is easier to see than to hear.</p>
    <p>You don't configure it. Your coding agent writes a <b>space</b>, a plain folder; Apprenticer serves it on your computer and you talk. The space's brief decides how the AI, which Apprenticer calls the mind, behaves: nothing about teaching or interviewing is built in. This page shows one space, a 20-minute lesson on why AI runs on GPUs. It is a static page: there is no AI on it, and nothing it shows was said in a session.</p>
    <ul class="facts">
      <li><b>Voice and a board</b>You talk; you hear the answer; the board beside it puts up the visual the answer is about, and moves it as the words are said.</li>
      <li><b>The mind writes every word</b>The voice model only listens and talks. Every reply, and every board move, is written by a text model that has read the whole space.</li>
      <li><b>A space is a folder</b>A brief in plain markdown, the visuals as HTML files, the sources it may draw on. Your coding agent writes it with you.</li>
      <li><b>Notes give it memory</b>When you end a session, the mind rewrites its notes, so next time it knows where you left off.</li>
    </ul>
    <p><a href="${REPO}">github.com/henryhobes/apprenticer</a> · <a href="#try">Try it yourself</a></p>
  </header>

  <section id="lesson">
    <h2>The lesson: ${esc(space.title)}</h2>
    <p>The brief sets the goal:</p>
    ${quote('Twenty minutes, by voice, with Alex. Alex walks away able to say, in their own words: a GPU is not a faster CPU, it wins only when the work splits into many independent pieces doing the same step; matrix multiply, the core of AI, is exactly that kind of work; the usual limit is memory, not arithmetic; and that is why a chatbot uses a sliver of an H100, and what batching and quantization do about it.')}
    <p>Alex is the learner the brief is written for: someone who works in finance, reads about AI chips every week, and has never written code. The arc is four predictions, each asked before the board shows the answer, then an explain-back:</p>
    <ol class="arc">
      <li><span class="t">0 to 6 min</span><span>${q('Lanes, 0 to 6 minutes')}: why thousands of lanes beat 96 cores only on one kind of work</span></li>
      <li><span class="t">6 to 10 min</span><span>${q('Matrix multiply, 6 to 10 minutes')}: the shape of work AI is made of</span></li>
      <li><span class="t">10 to 14 min</span><span>${q('Memory, 10 to 14 minutes')}: the chip is usually waiting on memory, not arithmetic</span></li>
      <li><span class="t">14 to 18 min</span><span>${q('The chatbot, 14 to 18 minutes')}: why one chatbot uses a sliver of an H100</span></li>
      <li><span class="t">18 to 20 min</span><span>The close: ${q('At about 18 minutes, wherever you are, go to the close.')}</span></li>
    </ol>
    <div class="bar" aria-hidden="true"><i style="flex:6"></i><i style="flex:4"></i><i style="flex:4"></i><i style="flex:4"></i><i style="flex:2"></i></div>
    <p class="key"><i>Gold-marked quotes</i> are from <a href="${TREE}/brief.md"><code>brief.md</code></a>, word for word: the brief's own words. No session has been recorded, so nothing here is a transcript.</p>
  </section>

  <section id="board">
    <h2>The board</h2>
    <p>These are the space's four visuals, built from its <code>visuals/</code> folder. In a session each part comes up as the tutor names it, and the tutor makes a move with a board line such as <code>BOARD: set mixed</code>. Here every part is already up: press the moves to step through them, as the tutor would.</p>
    ${beats}
    <article class="beat">
      <h3><span>5</span> The close</h3>
      <p><a href="#v03-roofline">The roofline</a> goes up with its labels hidden (<code>set labels off</code>), and the brief asks for the explain-back:</p>
      ${quote('In your own words, why does a chatbot use so little of this chip?')}
      <p>As Alex names the parts, the labels come back. Then one more, over <a href="#v01-lanes">the lanes</a>:</p>
      ${quote("So why isn't a GPU just a faster CPU?")}
      <p>Next time, the notes say which ideas Alex explained back, and the tutor will ${q('Open on the first open one with its visual and its prediction question, no recap')}.</p>
    </article>
  </section>

  <section id="space">
    <h2>The space is a folder</h2>
    <p>Everything above comes from these files. Change the brief and the tutor changes; there is no other configuration.</p>
    <ul class="folder">
      ${folder()}
    </ul>
  </section>

  <section id="try">
    <h2>Try it yourself</h2>
    <p>It runs on your computer, in your browser, and talks to OpenAI with your own API key. It needs Node 24 or later.</p>
<pre><code>git clone ${REPO} && cd apprenticer
npm install -g apprenticer
apprenticer ./examples/what-is-a-gpu</code></pre>
    <p>The first run asks for your <code>OPENAI_API_KEY</code> once and saves it to <code>~/.config/apprenticer/.env</code>. The page opens; tap <b>On</b>, allow the microphone, and the tutor speaks first. Tap <b>Off</b> when you're done.</p>
    <p>A session costs about $2 to $3 on your key. The page shows what the session has cost, and a new session is refused once a space has spent $20 in a day.</p>
    <p class="dim">To see the boards without a key: <code>apprenticer preview ./examples/what-is-a-gpu</code>. To make your own space: <code>apprenticer skill</code>, then tell your coding agent what you want to learn or rehearse.</p>
  </section>

  <footer>Apprenticer is MIT licensed. <a href="${REPO}">Source on GitHub</a>. This page is built from <code>examples/what-is-a-gpu</code> by <code>npm run site</code>.</footer>
</main>
<script>
// Each board scaled to its frame, built up in full on load (no one is talking), and its buttons sent into it.
const fit = () => document.querySelectorAll('.frame').forEach(f => f.firstElementChild.style.transform = \`scale(\${f.clientWidth / 1200})\`);
addEventListener('resize', fit); fit();
const send = (frame, msg) => frame.contentWindow.postMessage(msg, '*');
document.addEventListener('load', e => { if (e.target.tagName === 'IFRAME') send(e.target, { cmd: 'all' }); }, true);
document.querySelectorAll('iframe').forEach(f => { if (f.contentDocument?.readyState === 'complete') send(f, { cmd: 'all' }); });
document.addEventListener('click', e => {
  const b = e.target.closest('.board button'); if (!b) return;
  const frame = b.closest('.board').querySelector('iframe');
  if (b.dataset.cmd === 'reset') { frame.replaceWith(frame.cloneNode()); fit(); }
  else send(frame, { set: b.dataset.set });
});
</script></body></html>
`;
}

/** Writes the page into `out` (docs/ for GitHub Pages), with .nojekyll so Pages serves it as it is. */
export function buildSite(out: string) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), sitePage());
  writeFileSync(join(out, '.nojekyll'), '');
}

if (import.meta.main) { buildSite(process.argv[2] ?? 'docs'); console.log(`built ${process.argv[2] ?? 'docs'}/index.html`); }
