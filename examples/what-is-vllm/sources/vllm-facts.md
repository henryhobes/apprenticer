# vLLM facts: the only facts to use

Every claim about vLLM in this session comes from this file. Facts are from the PagedAttention paper (Kwon et al., SOSP 2023), the vLLM docs and the vLLM team's launch post, checked on 5 November 2026 and cited at the end. The paper's measurements are from 2023, on its own benchmarks: say "the paper measured" when you use them. The two boards (01-pages, 02-batch) are toys, marked as props below: hold their numbers constant and never present them as measurements.

## What it is

- vLLM is "a fast and easy-to-use library for LLM inference and serving" (the docs). Inference is running a trained model to get its output; serving is doing that for many requests arriving over the network.
- It was "originally developed in the Sky Computing Lab at UC Berkeley". It became a PyTorch Foundation hosted project on 7 May 2025, and is now maintained by a broad community of institutions and companies. It is open source.
- It is not a model. You load a model into it (an open-weights model such as Llama or Qwen) and it runs that model on your GPUs.
- Its headline features, from the docs: "Efficient management of attention key and value memory with PagedAttention"; "Continuous batching of incoming requests, chunked prefill, prefix caching"; and an "OpenAI-compatible API server".
- Hardware, from the installation page: GPUs from NVIDIA (CUDA), AMD (ROCm) and Intel (XPU), Apple Silicon through vLLM-Metal, and CPUs (x86, ARM, Apple silicon, IBM Z). Data-centre NVIDIA GPUs are the usual home; don't rank the others.

## The OpenAI-compatible server (the opening drawing)

- One command starts it: `vllm serve <model>`, for example `vllm serve Qwen/Qwen2.5-1.5B-Instruct`. "By default, it starts the server at http://localhost:8000."
- It serves the same routes as OpenAI's API, among them `/v1/chat/completions`, `/v1/completions`, `/v1/responses` and `/v1/embeddings`.
- The docs' client example is OpenAI's own Python library with two settings changed: `base_url` set to `http://localhost:8000/v1`, and the API key set to the placeholder `"EMPTY"`. "This allows vLLM to be used as a drop-in replacement for applications using OpenAI API." The `model` name in each request becomes the model you served.
- So for an app already on OpenAI's API, what changes is where the requests go and which model they name. What happens behind that URL is the rest of the session.

## The KV cache (beat 2)

- A model writes one token at a time, and each new token looks back at every token before it (that is what attention does). To avoid recomputing those earlier tokens every step, the server keeps each one's keys and values in GPU memory: the KV cache. A token is a word or part of one, the same unit OpenAI bills by.
- It is big. For OPT-13B, a 13-billion-weight model, the paper works it out: 2 (a key and a value) x 5,120 (hidden size) x 40 (layers) x 2 bytes = about 800 KB per token. A request up to 2,048 tokens long can need up to 1.6 GB.
- On a 40 GB NVIDIA A100 serving that 13B model, the paper's Figure 1: about 65% of memory holds the weights, which never change, and close to 30% holds the KV cache of the requests in flight.
- It changes size as it goes: it "dynamically grows and shrinks over time as the model generates new tokens", and a request's "lifetime and length are not known a priori". Nobody knows how long a reply will be until it ends.
- Before vLLM, serving systems stored each request's KV cache in one contiguous stretch of memory, so they had to "pre-allocate a contiguous chunk of memory with the request's maximum length (e.g., 2048 tokens)".
- The paper names three kinds of waste that causes: reserved (slots kept for tokens not written yet), internal fragmentation (slots reserved that the reply never uses because it ended early) and external fragmentation (gaps between reservations too small to use).
- The paper measured that in existing systems "only 20.4% - 38.2% of the KV cache memory is used to store the actual token states". The launch post puts it as existing systems wasting "60% – 80% of memory due to fragmentation and over-reservation".

## PagedAttention (beat 3)

- vLLM splits the KV cache into fixed-size blocks; in the paper each block holds the keys and values of 16 tokens by default. A request gets a new block only when its last one fills, and its blocks can sit anywhere in GPU memory. A per-request block table maps its blocks in order to where they physically are, and PagedAttention is the attention code that reads keys and values through that table.
- This is the idea of virtual memory and paging in operating systems, where a program sees one continuous memory but its pages are scattered in RAM. The paper: "one can think of blocks as pages, tokens as bytes, and requests as processes."
- Waste is then at most one partly filled block per request: vLLM "limits all the memory wastes for a request within one block". The launch post: "near-optimal memory usage, with a mere waste of under 4%."
- Blocks can be shared between requests with copy-on-write, as an operating system shares pages: for several replies from one prompt, the prompt's blocks are stored once. The paper measured 6.1% to 9.8% memory saved for parallel sampling and 37.6% to 55.2% for beam search. The docs' "prefix caching" reuses the blocks of a prefix that requests share.
- When free blocks run out, vLLM pauses (preempts) the most recently arrived request and frees all of its blocks, then either copies them to CPU memory or recomputes them when the request resumes. Requests are served first come, first served.

## Why more chats fit (beats 3 and 4)

- Less waste means more requests in the batch. The paper: "By reducing memory fragmentation and enabling sharing, vLLM runs more requests in a batch in parallel". On its ShareGPT chat workload with OPT-13B, vLLM ran 2.2 times as many requests at the same time as the previous best system, even when that system was given each reply's exact length in advance, and 4.3 times as many when it reserved the maximum.
- The headline result: "vLLM improves the throughput of popular LLMs by 2-4x with the same level of latency compared to the state-of-the-art systems, such as FasterTransformer and Orca", with bigger gains for longer sequences, larger models and more complex decoding. The launch post (June 2023, the vLLM team's own benchmarks): up to 24 times the throughput of Hugging Face Transformers and up to 3.5 times Text Generation Inference. It also says LMSYS, which ran Chatbot Arena, cut the GPUs it used for that traffic by 50%.
- Why more chats in a batch is more output (this is the GPU lesson's point, and the reason it matters): generating a token means reading the model's weights from memory, and one read of the weights serves every request in the batch. So the GPU writes one token for each chat in the batch per step, for nearly the cost of one.
- Throughput against latency: throughput is tokens (or finished chats) per second across everyone; latency is how long one person waits. Fitting more chats raises throughput; it does not make any one chat's tokens arrive faster. One line for it: same wait per chat, more chats per hour. The paper compares at "the same level of latency", so the extra throughput was not bought with slower replies on its benchmark.

## Continuous batching (beat 4)

- Request-level (static) batching: a batch of requests starts together and the batch runs until its longest request finishes; a request that finishes early leaves its slot idle, and new requests wait for the whole batch.
- Iteration-level scheduling, from Orca (Yu et al., OSDI 2022), usually called continuous batching: the server decides who is in the batch at every step, one step being one new token for each running request. A finished request leaves at once and a waiting one takes its place on the next step. The paper: "Unlike traditional methods that work at the request level, these techniques operate at the iteration level." vLLM does this and adds PagedAttention, so memory for a joining request is a few free blocks rather than a long contiguous stretch.
- Simplification: the toy on 02-batch counts every step as the same length. In reality a step with more requests takes somewhat longer, which is why a server caps how many run at once.

## Props: the two boards (toys, not measurements)

- 01-pages is a toy KV cache of 48 blocks, 3 rows of 16. Contiguous: chats 1, 2 and 3 each reserve a whole row (16 blocks, their maximum length) and use 8, 5 and 3 blocks; so 16 of 48 blocks hold tokens, a third, which happens to sit inside the paper's measured 20.4% to 38.2%. Chat 4 has no room. Paged: the same 16 used blocks stay where they are and the reservations vanish; chats 4 to 8 take 6, 5, 7, 4 and 6 free blocks, scattered, so 8 chats are in flight and 4 blocks stay free for growth. Real reservations were 2,048 tokens, which is 128 blocks of 16; the toy is scaled down. Its 3 to 8 is not a measured gain: the real figures are the 2.2 and 4.3 times above.
- 02-batch is a toy of 4 batch slots over 10 steps. Static: chat A runs all 10 steps; B finishes after 4, C after 6, D after 3; their slots sit idle; E, F and G wait. Finished after 10 steps: 4. Continuous: F takes D's slot at step 4 and finishes at step 8, E takes B's slot at step 5 and finishes at step 9, G takes C's slot at step 7 and finishes at step 10. Finished: 7. Chat A takes 10 steps either way.

Sources:
- Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention", SOSP 2023 (KV cache size, Figure 1, three kinds of waste, 20.4%-38.2%, blocks of 16, the paging analogy, within one block, copy-on-write savings, preemption, 2.2x and 4.3x, 2-4x): https://arxiv.org/abs/2309.06180
- vLLM docs, home page (description, Berkeley origin, features): https://docs.vllm.ai/en/latest/
- vLLM docs, Quickstart (vllm serve, localhost:8000, base_url, "EMPTY", drop-in replacement): https://docs.vllm.ai/en/latest/getting_started/quickstart.html
- vLLM docs, Online serving (the routes): https://docs.vllm.ai/en/latest/serving/online_serving/
- vLLM docs, Installation (hardware): https://docs.vllm.ai/en/latest/getting_started/installation/
- "vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention", vLLM team, 20 June 2023 (24x, 3.5x, 60%-80%, under 4%, LMSYS 50%): https://vllm.ai/blog/2023-06-20-vllm
- PyTorch Foundation, "PyTorch Foundation welcomes vLLM" (hosted project, May 2025): https://pytorch.org/blog/pytorch-foundation-welcomes-vllm/
- Yu et al., "Orca: A Distributed Serving System for Transformer-Based Generative Models", OSDI 2022 (iteration-level scheduling), as cited by the paper above.
