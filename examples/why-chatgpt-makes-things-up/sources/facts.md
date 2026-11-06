# Why ChatGPT makes things up, and what one answer costs: the only facts to use

Every real-world claim in this session comes from this file. Facts were checked on 5 November 2026 and are cited under each section. Prices move: if Maya asks whether a price is current, say "as of November 2026". Three things on the boards are props or modelling assumptions, each marked where it appears: the word probabilities on 01-next-word, the three dates in the "set again" move, and the 2,000 input tokens on 03-cost. Hold them constant and never present them as measured.

Never state anything about OpenAI's internal costs, its servers, how many people use ChatGPT, or which model ChatGPT runs on today: none of it is here, and none of it is public in a form we checked. If asked, say you don't know and that OpenAI doesn't publish it.

## How the model writes: one next token at a time

- OpenAI's GPT-4 Technical Report (March 2023): GPT-4 "is a Transformer-based model pre-trained to predict the next token in a document". Later models are built the same way and then further trained to follow instructions and to give answers people prefer. Source: OpenAI, "GPT-4 Technical Report", arXiv:2303.08774.
- What that means for a reply: the model reads everything so far, gives every possible next token a probability, one is picked, and the whole thing repeats with that token added, until the answer is done. Nothing in that loop looks anything up or checks a fact unless a tool (like web search) is switched on and used.
- A token is a chunk of text: a short word, or part of a longer one. OpenAI's rule of thumb for English: one token is about 4 characters, and 100 tokens is about 75 words. Exact counts vary by model. Source: OpenAI Help Center, "What are tokens and how to count them" (help.openai.com/en/articles/4936856).
- Prop on 01-next-word: the bars and percentages for "The capital of France is" (Paris tall, a few others short) and for "Adam Kalai was born in" (five years, all short and nearly equal) are illustrative, drawn to show the shape, not read from any real model. Say so if asked.

## Why it makes things up

OpenAI calls these "hallucinations": answers a model gives confidently that aren't true. From OpenAI's post "Why language models hallucinate" (5 September 2025, openai.com/index/why-language-models-hallucinate) and the paper behind it, "Why Language Models Hallucinate" by Adam Tauman Kalai, Ofir Nachum, Santosh S. Vempala and Edwin Zhang (arXiv:2509.04664, 4 September 2025):

- The real example: asked for the title of Adam Tauman Kalai's PhD dissertation (he is one of the authors), "a widely used chatbot" confidently gave three different answers, none correct. Asked for his birthday, it gave three different dates, all wrong. The post doesn't say which chatbot.
- Prop for "set again" on 01-next-word: the three dates shown are invented for the board, not the dates the chatbot actually gave (the post doesn't print them in a form we use). Say "three different dates, like these" and never present them as the real ones.
- Where it comes from, in pretraining: the model learns from text by predicting the next word, with no label saying which statements are true. Spelling and grammar follow consistent patterns, so they come out right; rare, arbitrary facts (the post's example is a pet's birthday) can't be predicted from patterns at all. When there's no pattern to follow, the model still has to produce some next word, and the most fluent-sounding guess wins.
- Why training doesn't remove it: most tests that models are scored on count only right answers. The post's analogy is a multiple-choice test: guess on a birthday and you have a 1 in 365 chance of the point; say "I don't know" and you get zero for sure. So, scored on accuracy alone, the model that guesses beats the one that admits it doesn't know. The paper's line: language models "are optimized to be good test-takers, and guessing when uncertain improves test performance."
- The numbers (SimpleQA, a test of short factual questions, figures from the GPT-5 system card as quoted in the post):

| | gpt-5-thinking-mini | OpenAI o4-mini |
|---|---|---|
| Says it doesn't know | 52% | 1% |
| Right | 22% | 24% |
| Wrong | 26% | 75% |

  The older o4-mini scores slightly higher on accuracy, 24 against 22, while being wrong almost three times as often, 75 against 26. An accuracy-only leaderboard ranks it first.
- The fix OpenAI proposes: score tests so that a confident wrong answer costs more than "I don't know", and give partial credit for saying you're unsure, the way some exams take marks off for wrong answers. OpenAI says hallucinations have gone down in newer models but remain; it does not claim they're gone.
- ChatGPT itself carries the line "ChatGPT can make mistakes. Check important info." under the message box.

## A public case: the lawyers and the invented cases

- Mata v. Avianca, US District Court for the Southern District of New York, case 1:22-cv-01461, Judge P. Kevin Castel. In 2023 a lawyer, Steven Schwartz, filed a brief citing court decisions, including "Varghese v. China Southern Airlines", that did not exist: ChatGPT had produced them. When he asked ChatGPT whether Varghese was real, it said yes. Opposing lawyers couldn't find the cases; the judge confirmed they were invented, with invented quotes and docket numbers.
- On 22 June 2023 the judge sanctioned the two lawyers and their firm, with a $5,000 penalty (as reported in news coverage of the sanctions order; the amount is from press reports, not read from the order itself). Sources: Reuters, CNN and The Volokh Conspiracy coverage, May and June 2023.
- The point for this session: asking the model "are you sure?" runs the same next-word machinery again. It can't check, so it can confidently say yes.

## What an answer costs: tokens to cents

API prices, per million tokens, standard tier, from OpenAI's API pricing page (developers.openai.com/api/docs/pricing), checked 5 November 2026. The page carries no date of its own.

| Model | Input | Cached input | Output |
|---|---|---|---|
| gpt-6-astra | $10.00 | $1.00 | $50.00 |
| gpt-6.1-sol | $2.00 | $0.10 | $10.00 |
| gpt-6.1-terra | $1.00 | $0.05 | $5.00 |
| gpt-6-luna | $0.10 | $0.01 | $0.50 |

- Input tokens are what's sent in (the question and everything before it); output tokens are what the model writes. Output costs five times as much as input for these models.
- On the API, each request carries the whole conversation so far as input, so a long chat's later replies cost more than its first. Cached input (text already sent recently) is billed at a twentieth of the input price on gpt-6.1-sol.
- Reasoning ("thinking") models write hidden reasoning tokens before the visible answer. They are billed as output tokens even though you never see them, so a short visible answer can cost more than its text suggests. Source: OpenAI Help Center, "Understanding and counting tokens".
- The calculation on 03-cost, for one long answer at gpt-6.1-sol's list price:
  - The answer: about 750 words, which is about 1,000 tokens (100 tokens is about 75 words). 1,000 x $10 per million = $0.01, one cent.
  - The input: 2,000 tokens, for the question and the conversation before it. This is a modelling assumption, not a measured figure. 2,000 x $2 per million = $0.004, under half a cent.
  - Total: about 1.4 cents. With no thinking tokens and no web search. A thinking model writing, say, 5,000 hidden tokens first would add 5 cents at the same price (an illustration, not a measured count).
- This is a price, not a cost. The API price is what OpenAI charges developers. What it costs OpenAI to run the answer (chips, power, data centres) isn't published. Never say "it costs OpenAI 1.4 cents".

## Plus is not the API

- ChatGPT Plus is a subscription: $20 a month in the US. That list price has held since Plus launched in February 2023 (OpenAI launch announcement, 1 February 2023; still $20 in 2026 per multiple pricing reports; chatgpt.com/pricing shows the plans but would not render the figure when checked). Prices differ by country and with tax. Other plans exist (Go, Pro, Business); don't quote their prices.
- Plus has usage limits ("Limits apply", per chatgpt.com/pricing): the subscription is a flat fee with a cap, not a meter.
- OpenAI's Help Center says API usage is "separate and billed independently": a Plus subscription doesn't include any API use, and the API is pay as you go, per token.
- The comparison on 03-cost ("set plus"): $20 / 1.4 cents is about 1,400 answers of that size a month, about 47 a day, at API list prices. It is a way to feel the scale, not a claim about what OpenAI earns or spends on any subscriber: we don't know which model ChatGPT runs a given reply on, or what it costs OpenAI.
