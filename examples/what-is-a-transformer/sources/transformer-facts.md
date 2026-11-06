# Transformer facts: the only facts to use

Every claim about how transformers work comes from this file. Facts are from the papers themselves, read on 5 November 2026 and cited under each section. The sentence "we fished from the bank", every attention percentage on the boards, and the next word "for" are props for the board, marked as props below: hold them constant, and never present them as read out of a real model.

## Where the name comes from

- "Attention Is All You Need", by Vaswani and seven co-authors, most at Google Brain and Google Research, posted to arXiv on 12 June 2017 and published at NIPS 2017 (the conference now called NeurIPS). It introduced "a new simple network architecture, the Transformer, based solely on attention mechanisms", dropping the recurrent and convolutional designs that led translation at the time.
- It was built for machine translation (English to German, English to French), not chatbots. Its results: 28.4 BLEU on English to German, and a new best of 41.8 on English to French, "after training for 3.5 days on eight GPUs" (NVIDIA P100s; the smaller base model trained in 12 hours). BLEU is a translation-quality score; don't explain it beyond "a standard translation score".
- GPT stands for Generative Pre-trained Transformer. OpenAI's first GPT paper (Radford and others, 2018, "Improving Language Understanding by Generative Pre-Training") used "a 12-layer decoder-only transformer with masked self-attention heads".
- Claude: Anthropic does not publish Claude's architecture. Its own interpretability research on Claude 3 Sonnet ("Scaling Monosemanticity", 2024) studies the model's layers and its "residual stream" and speaks of "the transformer architecture". So say "Claude is a transformer too, by Anthropic's own research papers; the exact design isn't public."

Sources:
- Vaswani et al., "Attention Is All You Need", arXiv:1706.03762, NIPS 2017: https://arxiv.org/abs/1706.03762
- Radford et al., "Improving Language Understanding by Generative Pre-Training", OpenAI, 2018: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
- Anthropic, "Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet", 2024: https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html

## Beat 1: tokens in a line (visual 01-attention)

- A model doesn't read letters or whole words: text is cut into tokens, pieces that are often a whole common word and sometimes part of one. OpenAI's rule of thumb for English: one token is about four characters, about three quarters of a word; 100 tokens is about 75 words. Tokenization differs between models.
- Each token is turned into a long list of numbers (in the paper's words, a vector; 512 numbers per token in the 2017 base model, 12,288 in GPT-3). Everything the model does after that is arithmetic on these lists. The board doesn't show these numbers.
- Before 2017, the leading translation models were recurrent: they read a sentence one position at a time, each step needing the previous step's result. The paper: "This inherently sequential nature precludes parallelization within training examples." A transformer takes every token of the text in the same step; that is what made it fast to train on GPUs.
- Order: because the transformer has "no recurrence and no convolution", it has no built-in sense of which token came first, so "we must inject some information about the relative or absolute position of the tokens". The 2017 paper added a position signal to each token's numbers ("positional encodings", made from sine waves). Later models use other position schemes; the idea is the same.
- Reading against writing, in a chatbot: it reads your whole message in one pass, all tokens at once. It writes its reply one token at a time, because each new token depends on the one it just chose.
- Prop: "we fished from the bank" is shown as five tokens, one per word, for the board. A real tokenizer might split it slightly differently; if asked, say so.

Sources:
- Vaswani et al. 2017, sections 1 and 3.5 (above).
- OpenAI Help Center, "What are tokens and how to count them?": https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them

## Beat 2: attention, who looks at whom (visual 01-attention)

- Attention lets each token take information from other tokens. The paper describes it as "mapping a query and a set of key-value pairs to an output", where the output is a weighted sum of values.
- In plain words: every token sends out a question (its query: what am I looking for?), every token offers a label (its key: what do I have?) and a message (its value: what I pass on). The model scores how well each query matches each key; the scores become weights that add up to 100 percent; and the token takes in a blend of the messages, mostly from the tokens it scored highest. Nobody writes these rules: the numbers that make the queries, keys and values are learned in training.
- Self-attention: the tokens are all from the same text, so the text attends to itself. Every token does this at once.
- Multi-head: the model runs several attentions side by side, each free to look for something different: 8 "heads" per layer in the 2017 paper, 96 in GPT-3.
- Looking back only: a chatbot model is trained to guess the next token, so a token may look only at itself and the tokens before it, never ahead; otherwise it could copy the answer. The 2017 paper's decoder does this with a mask, "to prevent positions from attending to subsequent positions". GPT-style models (decoder-only) use only this half.
- The original was encoder-decoder, because it translated: an encoder read the whole source sentence with every word free to look both ways, and a decoder wrote the translation one token at a time, looking back at its own words and across at the encoder's. Bring this up only if Sam asks about the original, or about why a chatbot can't look ahead.
- Prop: the attention from "bank" on 01-attention is invented for the board, not measured from a model: fished 70 percent, from 15, we 5, the 5, bank itself 5 (not drawn). With "borrowed" in place of "fished", the same weights. Real attention is spread over many heads and layers and is rarely this tidy. The meanings under "bank" ("riverside", "money") are a picture of the idea that a token's numbers change with context, not a readout.

Sources:
- Vaswani et al. 2017, sections 3.1, 3.2 and 3.2.3 (above).
- Brown et al. 2020, Table 2.1 (below).

## Beat 3: one layer, and the stack (visual 02-layer)

- One layer has two steps, in the paper's words "a multi-head self-attention mechanism" and "a simple, position-wise fully connected feed-forward network". On the board: attention (tokens trade information), then "think alone" (the feed-forward step: each token, on its own, goes through the same small network). The feed-forward step "is applied to each position separately and identically".
- Each step adds its result to the token's numbers rather than replacing them (a "residual connection"), so a token's list of numbers flows up through the layers, getting more context at each one. Only bring this up if asked.
- What the feed-forward step does: researchers have found it acts much like a memory lookup. Geva and others (2021): "Feed-forward layers constitute two-thirds of a transformer model's parameters", and they find these layers work "as key-value memories". Say "researchers find" for this, not "it is".
- Then the next layer does the same again with its own learned numbers. The 2017 translator stacked 6 layers in its encoder and 6 in its decoder. GPT-3 (OpenAI, 2020), 175 billion learned numbers in all, stacked 96 layers, each 12,288 numbers wide, with 96 heads. Today's largest labs don't publish their layer counts.
- Writing: after the last layer, the last token's numbers are turned into a score for every token the model knows; it picks one, adds it to the end of the line, and runs again. The pick needn't be the top score: it can be drawn at random, weighted by the scores, which is one reason the same question can get different answers. The GPT-3 paper made some of its samples this way, "with a temperature of 1 and a top p of 0.9" (settings for how adventurous the draw is). GPT-3 could take in 2,048 tokens at a time; current models take far more.
- Prop: the next word "for" on 02-layer ("we fished from the bank for ...") is the board's example, not a recorded output.

Sources:
- Vaswani et al. 2017, sections 3.1 and 3.3 (above).
- Brown et al., "Language Models are Few-Shot Learners", arXiv:2005.14165, 2020, section 2.1 and Table 2.1 (GPT-3 175B: 96 layers, width 12,288, 96 heads; context window 2,048 tokens): https://arxiv.org/abs/2005.14165
- Geva et al., "Transformer Feed-Forward Layers Are Key-Value Memories", EMNLP 2021, arXiv:2012.14913: https://arxiv.org/abs/2012.14913

## Where its knowledge comes from (only if asked)

- Training is next-word practice at enormous scale. GPT-1's paper describes "a language modeling objective" on a large body of text: guess each next token, and nudge the learned numbers toward better guesses. GPT-3 was trained on a total of 300 billion tokens.
- What it knows ends up spread through those learned numbers, not filed as entries. When it answers, it doesn't search its training text or a database; it runs the layers on your message. (Some chatbots also have separate search tools bolted on; that is a program around the model, not the transformer itself.)
- So "it isn't looking facts up" and "researchers find the feed-forward step acts like a memory" fit together: the memory is in the learned numbers, built during training.

Sources:
- Radford et al. 2018, section 3.1 (above).
- Brown et al. 2020, section 2.1: "All models were trained for a total of 300 billion tokens."; sampling settings from its section on generated samples (above).

## The name

- The electrical transformer (the box on a power line) is an unrelated device that shares the word; the 2017 paper doesn't say why it chose the name.

## Not covered here

The details of training (how the nudging is done), why it works as well as it does, whether it "understands", and comparisons between companies' models are outside this session's sources. Say so in a sentence, and offer what the board does show.
