# What is a token: the only facts to use

Every claim about tokens, tokenizers, prices and limits in this session comes from this file. Checked on 9 November 2026. The token splits and counts were measured, not quoted: each was run through OpenAI's open-source tokenizer library, tiktoken (version 0.12.0), on 9 November 2026. Prices and window sizes move: if Leah asks whether one is current, say "as of November 2026".

Never state which tokenizer OpenAI's current GPT-6 models use, what any other company's tokenizer does to these sentences, or a market's or company's real API bill: none of it is here. If asked, say you'd have to check.

## What a token is

- A model doesn't read letters or words. Its tokenizer cuts the text into tokens, pieces that are often a whole common word and sometimes part of one, and turns each piece into a number, its id in the model's vocabulary. Everything the model does after that is arithmetic on those numbers. When it writes, it picks the next token's number, and the tokenizer turns it back into text.
- The vocabulary is fixed before the model is trained, by a program that reads a huge amount of text and gives the most common chunks their own token. That is why common words, mostly English ones, tend to be one token, and rare words and other scripts get cut into more pieces. (Explanation, the standard account of how these tokenizers are built.)
- The space before a word is usually part of its token: " grandmother", with its leading space, is one token. On the board a leading space shows as a small dot.
- OpenAI's rule of thumb for English: one token is about 4 characters, and 100 tokens is about 75 words, so a token is about three quarters of a word. Exact counts vary by model and by text. Source: OpenAI Help Center, "What are tokens and how to count them?", help.openai.com/en/articles/4936856 (the same rule is quoted in this repo's what-is-a-transformer and why-chatgpt-makes-things-up facts, checked November 2026).

## Which tokenizer the counts use

- tiktoken's model table (version 0.12.0) maps GPT-4o, GPT-4.1, o3 and GPT-5 to the tokenizer called o200k_base, about 200,000 tokens in its vocabulary (200,019). It maps GPT-4 and GPT-3.5 Turbo to the older cl100k_base, about 100,000 (100,277). Source: github.com/openai/tiktoken, tiktoken/model.py.
- On the boards, "GPT-4o's tokenizer" means o200k_base and "GPT-4's" means cl100k_base. Say "GPT-4o's tokenizer", never "ChatGPT's today": which one current models use isn't in the table.

## The sentence on 01-chop (measured)

"My grandmother bakes unbelievably good sourdough." is 6 words and, with GPT-4o's tokenizer, 10 tokens:

| token | My | ·grandmother | ·b | akes | ·unbelievably | ·good | ·sour | d | ough | . |
|---|---|---|---|---|---|---|---|---|---|---|
| id | 5444 | 57468 | 287 | 6861 | 180692 | 1899 | 22918 | 67 | 1870 | 13 |

- The long word "unbelievably" is one token; the short word "bakes" is two; "sourdough" is three; the full stop is its own token. Length doesn't decide it: how common the chunk was in the tokenizer's training text does.
- With GPT-4's older tokenizer the same sentence is 11 tokens.
- The ids are the real ones from o200k_base. They are only labels in a list: 180692 isn't "bigger" or "more" than 13 in any sense that matters.

## Same question, three languages, on 02-languages (measured)

"Where is the train station?", in English, Hindi and Amharic (the main language of Ethiopia), counted with both tokenizers:

| | the question | GPT-4o's tokenizer | GPT-4's tokenizer |
|---|---|---|---|
| English | Where is the train station? | 6 | 6 |
| Hindi | रेलवे स्टेशन कहाँ है? | 6 | 20 |
| Amharic | የባቡር ጣቢያው የት ነው? | 28 | 37 |

- With GPT-4o's tokenizer the Amharic question takes 28 tokens to English's 6: about 4.7 times as many (28 / 6 = 4.67), for the same question. This is one sentence, measured, not an average over the language: say "for this question".
- Hindi went from 20 tokens with GPT-4's tokenizer to 6 with GPT-4o's: the newer tokenizer has about twice the vocabulary, and Hindi words got pieces of their own. Who gets the cheap pieces is a choice made when the tokenizer is built.
- The research behind it: Petrov, La Malfa, Torr and Bibi, "Language Model Tokenizers Introduce Unfairness Between Languages", NeurIPS 2023, arXiv:2305.15425: "The same text translated into different languages can have drastically different tokenization lengths", and "these disparities persist even for tokenizers that are intentionally trained for multilingual support." Don't quote a ratio from the paper: the numbers here are the measured ones above.

## Why it matters: limits and the bill, on 03-limits

- Limits are counted in tokens. As of November 2026, OpenAI's model list shows its current GPT-6 family with a window of "1.05M" tokens: what the model can read at once, the conversation and anything pasted in. Source: OpenAI, Models, developers.openai.com/api/docs/models (as checked in this repo's what-is-a-context-window facts, November 2026).
- By the rule of thumb, 1,050,000 tokens is about 790,000 English words (1,050,000 x 0.75 = 787,500; arithmetic, not a quoted figure).
- The API bill is counted in tokens. gpt-6.1-sol's list price, standard tier: $2.00 per million input tokens (what's sent in) and $10.00 per million output tokens (what it writes). Source: OpenAI API pricing, developers.openai.com/api/docs/pricing, checked 5 November 2026 (in this repo's why-chatgpt-makes-things-up facts).
- So for the question on 02-languages, the Amharic version costs about 4.7 times as much to send and fills about 4.7 times as much of the window as the English one, if gpt-6.1-sol's tokenizer splits it the way GPT-4o's does. That last part is an assumption: the counts are GPT-4o's tokenizer's. Say so if asked.
- A token on the bill is a token whatever it holds: a space, a full stop, half a word.

## Only if asked

- "Why can't it count the r's in strawberry?": with GPT-4o's tokenizer " strawberry", with its leading space, is a single token, id 101830. The model gets that one number, not ten letters, so the letters aren't in front of it. That is a common explanation for the slips models have made on such questions, not the whole story: newer models often get it right.
- Numbers get cut into chunks of up to three digits: "1234567" is three tokens, "123", "456", "7". Dates too: "2026-11-09" is six.
- Emoji: "😀" is one token with GPT-4o's tokenizer, two with GPT-4's.
- "How do I count my own tokens?": OpenAI's tokenizer page and the tiktoken library count them; the API also reports each request's input and output tokens.
- Why a long chat forgets: that's the what-is-a-context-window lesson. What one answer costs in cents: the why-chatgpt-makes-things-up lesson.
