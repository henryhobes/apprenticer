import { chmodSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
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

// developers.openai.com/api/docs/models/gpt-live-1, Oct 2026. Only voice minutes and web searches are
// counted; the mind's own tokens bill separately and aren't.
export const LIVE_USD_PER_MINUTE = 0.05;
export const WEB_SEARCH_USD = 0.01;

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
