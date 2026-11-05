# GPU facts: the only numbers to use

Every number in this session comes from this file. Vendor specs are cited; everything else is arithmetic on them, shown so it can be checked. The modelling choices (marked "assumption") are teaching simplifications, not measurements: say so if asked. Ported from the "What is a GPU?" explainer (data.js).

## The two machines

| | AMD EPYC 9654 (CPU) | NVIDIA H100 SXM (GPU) |
|---|---|---|
| Workers | 96 cores, each runs its own instructions | 16,896 FP32 CUDA cores ("lanes"): 132 SMs x 128 |
| Peak arithmetic | about 10.9 TFLOP/s, FP32 | 989.4 TFLOP/s, bf16, dense, on the tensor cores |
| Memory bandwidth | 460.8 GB/s (DDR5-4800, 12 channels) | 3.35 TB/s (HBM3) |
| Power | 360 W | up to 700 W |

- EPYC peak, worked out: 96 cores x 3.55 GHz all-core boost x 32 FP32 flops per core per cycle (two FMA pipes x 8 lanes x 2 flops) = 10.9 trillion flops per second. AMD does not publish a FLOP/s figure; this is the arithmetic.
- EPYC bandwidth: 12 channels x 4,800 million transfers/s x 8 bytes = 460.8 GB/s.
- The H100 spec page lists 1,979 TFLOP/s for bf16, but its footnote says "with sparsity": it assumes 2:4 sparsity (half the numbers are zero and skipped). The dense figure is half of that, 989.4. Never quote 1,979 without saying it is the sparsity number.
- bf16 is a 2-byte number format used in AI. FP32 is 4 bytes. TFLOP/s = trillion arithmetic operations per second.
- HBM (high-bandwidth memory): memory chips stacked and placed right beside the processor. It is one of the scarcest, most expensive parts of an AI chip. 3.35 TB/s is about 7.3 times the EPYC's 460.8 GB/s.

Sources:
- NVIDIA H100 product page, specifications table (BF16 Tensor Core 1,979 teraFLOPS with sparsity; 3.35 TB/s; up to 700 W): https://www.nvidia.com/en-us/data-center/h100/
- NVIDIA Technical Blog, "NVIDIA Hopper Architecture In-Depth" (H100 SXM5: 132 SMs, 128 FP32 CUDA cores per SM, 16,896 per GPU): https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/
- AMD EPYC 9654 product page (96 cores, 3.55 GHz all-core boost, 360 W, 12 channels DDR5 up to 4800 MT/s, 460.8 GB/s per socket): https://www.amd.com/en/products/processors/server/epyc/4th-generation-9004-and-8004-series/amd-epyc-9654.html

## Beat 1: the shape of the work (visual 01-lanes)

- A GPU's lanes move in lockstep: on each tick they all carry out the same instruction, each on its own piece of data. A CPU core follows its own list of instructions.
- The toy: both machines get the same 16,896 pieces of work (one per GPU lane).
- Assumption: one piece per lane per tick; a CPU core does 2 per tick, because it clocks roughly twice as fast.
- CPU: 16,896 / (96 cores x 2) = 88 ticks, however the work is mixed, because every core runs its own task.
- GPU, all one kind of work: 1 tick. Split into 100 different kinds: 100 ticks, because it runs one kind per tick and the other lanes sit idle.
- So with 100 kinds the two are about even (100 against 88), and the GPU is drawing up to 700 W against the CPU's 360 W. Say "about even", don't oversell it.
- The honest footnote: a real GPU's lanes come in groups of 32, and different groups can follow different instructions; within a group they still march together. The toy shows that effect.
- When each step needs the previous step's answer, only one piece of work is ever ready, and extra lanes don't help at all.

## Beat 2: why AI is shaped like that (visual 02-matmul)

- Almost all the arithmetic in an AI model is matrix multiplication: the same multiply-and-add, repeated an enormous number of times, with no piece waiting on any other.
- An 8x8 by 8x8 multiply: each of the 64 answer cells takes one row of the first grid and one column of the second, multiplies them pair by pair and adds up the 8 products. 64 cells x 8 = 512 multiply-adds. No cell needs another cell's answer, so they can run in any order, or all at once.
- At real size, a 4,096 x 4,096 multiply (a routine size inside a language model) is 4,096 cubed = about 68.7 billion multiply-adds.
- Assumption: one multiply-add per lane per nanosecond, and perfect sharing of the work. One lane: 68.7 s. 16,896 lanes at once: 4.07 ms. This is a model, not a measurement; the point is the ratio, which is just the number of lanes.
- GPUs were built to draw millions of pixels the same way; AI turned out to be the same shape of work.

## Beat 3: the real ceiling is memory (visual 03-roofline)

- Lanes can only work on numbers that have already arrived from memory.
- Arithmetic intensity: how many operations the work does per byte it fetches from memory.
- The roofline: the speed you get is the lower of two limits, peak arithmetic, or bandwidth x intensity. Below some intensity the chip runs out of data before it runs out of arithmetic.
- Ridge point = peak / bandwidth. H100: 989.4 TFLOP/s / 3.35 TB/s = about 295 operations per byte. EPYC: 10.9 TFLOP/s / 460.8 GB/s = about 23.7. The H100's ridge is about 12.5 times further right: its arithmetic grew far faster than its memory.
- At an intensity of about 100 (a typical matrix multiply), the EPYC runs at its full peak, but the H100 reaches 3.35 TB/s x 100 = 335 TFLOP/s, about 33.9% of its peak.
- Every extra byte per second of bandwidth moves the ridge left and lets more real work reach peak speed. That is why the money goes into HBM.

## Beat 4: why a chatbot is memory-bound (visual 04-chatbot, and 03-roofline again)

- To produce each token (roughly a word), a language model reads every one of its weights (the learned numbers that make up the model) once and does 2 operations with each, a multiply and an add.
- In bf16 each weight is 2 bytes, so the intensity is 2 operations / 2 bytes = 1 operation per byte.
- At intensity 1 the H100 reaches 3.35 TFLOP/s: about 0.34% of its 989.4 TFLOP/s peak.
- Example size (assumption): a 70-billion-weight model. 70 billion x 2 bytes = 140 GB read per token. 3.35 TB/s / 140 GB = about 24 tokens per second, set entirely by memory.
- Quantizing to 8 bits (1 byte per weight) halves the bytes: 70 GB per token, about 48 tokens per second, and the H100 reaches 6.7 TFLOP/s (about 0.68% of peak). The arithmetic is unchanged (still 2 operations per weight); only the storage shrank. No compute was added, because compute was never the limit.
- Batching: providers serve many users at once. Each weight fetched serves every request in the batch, so intensity rises with the batch size. It takes a batch of about 295 to reach the H100's ridge.
- Assumptions for this beat: one user (batch 1), weight reads dominate memory traffic, the H100 runs at full bandwidth, and the model fits on one chip (in practice a 70-billion-weight model in bf16 needs more than one H100's 80 GB; the per-chip arithmetic is the same). The 70 billion is an example size.
