import { chmodSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import OpenAI from 'openai';

// Environment only. A .env in the folder you run it from wins, then ~/.config/apprenticer/.env;
// real environment variables beat both. The key never goes into a space.
export const ENV_FILE = `${homedir()}/.config/apprenticer/.env`;
for (const file of [`${process.cwd()}/.env`, ENV_FILE]) if (existsSync(file)) process.loadEnvFile(file);

const env = process.env;

export const config = {
  openaiApiKey: env.OPENAI_API_KEY ?? '',
  port: Number(env.PORT ?? 8787),
  dailyCapUsd: Number(env.DAILY_CAP_USD ?? 10),
  liveModel: env.LIVE_MODEL ?? 'gpt-live-1',
  voice: env.VOICE ?? 'vesper', // British English, masculine (GPT-Live voice list)
  mindModel: env.MIND_MODEL ?? 'gpt-6.1-sol',
  // The mind's answers during a session: Ultrafast costs 6x Standard but writes a whole answer in
  // about 2 s instead of 5 (measured Oct 2026). MIND_TIER=default switches it off.
  mindTier: (env.MIND_TIER ?? 'ultrafast') as 'ultrafast' | 'fast' | 'default',
};

// developers.openai.com/api/docs/models/gpt-live-1, Oct 2026.
export const LIVE_USD_PER_MINUTE = 0.05;
export const WEB_SEARCH_USD = 0.01;

// What the mind's tokens cost: USD per million of input, cached input and output at the Standard tier
// (gpt-6.1-sol, developers.openai.com/api/docs/models/gpt-6.1-sol, Nov 2026; set MIND_PRICE="in,cached,out"
// if you change MIND_MODEL), times the tier the response says it was served on.
const PRICE = (env.MIND_PRICE ?? '2,0.1,10').split(',').map(Number);
if (PRICE.length !== 3 || !PRICE.every(Number.isFinite)) throw new Error('MIND_PRICE is three numbers: USD per million input, cached input and output tokens, like 2,0.1,10');
const TIER_PRICE: Record<string, number> = { default: 1, fast: 2, ultrafast: 6 };

/** The cost of one model response, from its own `usage` (output includes the reasoning tokens). */
export interface Priced { output?: { type: string }[]; usage?: { input_tokens: number; output_tokens: number; input_tokens_details?: { cached_tokens?: number } } | null; service_tier?: string | null }
export function tokensUsd(res: Priced): number {
  const [input, cached, output] = PRICE, { input_tokens = 0, output_tokens = 0, input_tokens_details } = res.usage ?? {}, hit = input_tokens_details?.cached_tokens ?? 0;
  return ((input_tokens - hit) * input + hit * cached + output_tokens * output) / 1e6 * (TIER_PRICE[res.service_tier ?? ''] ?? 1);
}

/** What the mind's model calls (turns and their searches, drawings, the notes pass) have cost since the program started. A session takes the difference from when it began; only one runs at a time. */
export const spend = { usd: 0 };
export const meter = (res: Priced) => { spend.usd += tokensUsd(res) + (res.output?.filter(o => o.type === 'web_search_call').length ?? 0) * WEB_SEARCH_USD; }; // and the mind's searches

/** A file that ships with the package (public/, template/). The code runs from src/, or, published, from dist/src/: one level deeper. */
export const packageFile = (rel: string) => resolve(import.meta.dirname, basename(dirname(import.meta.dirname)) === 'dist' ? '../..' : '..', rel);

let client: OpenAI | undefined;
export const openai = () => (client ??= new OpenAI({ apiKey: config.openaiApiKey }));

/** Makes sure there is an API key: asks for it once in the terminal and keeps it in the user's config folder. */
export async function requireKey() {
  if (config.openaiApiKey) return;
  if (!process.stdin.isTTY) throw new Error(`OPENAI_API_KEY is not set. Export it, or put it in ${ENV_FILE}.`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const key = (await rl.question('OpenAI API key (saved to ' + ENV_FILE + '): ')).trim();
  rl.close();
  if (!key) throw new Error('No key given.');
  mkdirSync(`${homedir()}/.config/apprenticer`, { recursive: true });
  appendFileSync(ENV_FILE, `OPENAI_API_KEY=${key}\n`);
  chmodSync(ENV_FILE, 0o600);
  config.openaiApiKey = key;
}
