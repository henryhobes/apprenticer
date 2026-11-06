# Nvidia's moat: the only facts to use

Every claim about Nvidia, its software and its competitors in this session comes from this file. Checked on 5 November 2026; sources are under each section. The newest annual report is Nvidia's Form 10-K for the fiscal year ended 25 January 2026 (filed 25 February 2026). Where a line is explanation rather than a reported fact, it says so. There are no market-share numbers here: never give one, and never say what share of AI runs on Nvidia.

This is how the business works, not investment advice. No share prices, no forecasts, no view on buying or selling.

## CUDA: the common language

- CUDA is Nvidia's programming platform for its GPUs. Nvidia's own words: "CUDA is NVIDIA's platform for accelerated computing", the software layer that lets programs use the GPU, from C++, Python and Fortran. (Nvidia CUDA Zone)
- Nvidia introduced CUDA in 2006. Its 10-K: "With our introduction of CUDA in 2006, we opened the parallel processing capabilities of our GPU to a broad range of compute-intensive applications." The first card that ran it was the GeForce 8800 GTX, launched 8 November 2006. (10-K; tech press, e.g. TechSpot's History of the GPU)
- CUDA runs only on Nvidia GPUs. The 10-K calls it "the foundational NVIDIA CUDA development platform that runs on all NVIDIA GPUs".
- In 2012 the AlexNet neural network, "trained on NVIDIA GPUs", won the ImageNet image recognition competition. (10-K) That is the usual starting point for the modern AI boom, and it ran on CUDA.
- Nvidia says there are "over 7.5 million developers worldwide using CUDA and our other software tools". This is Nvidia's own count, in its 10-K; say "Nvidia says". Older and secondary sources give lower figures (5 million and less); use only 7.5 million, as Nvidia's claim.
- "More than half of our engineers work on software." (10-K)
- What a GPU does is the "What is a GPU?" lesson. Don't reteach it. If asked, one sentence: it does thousands of small sums at once, which is what training and running AI needs.

Sources:
- Nvidia Form 10-K, fiscal 2026: https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm
- Nvidia CUDA Zone: https://developer.nvidia.com/cuda-zone
- TechSpot, History of the GPU part 4: https://www.techspot.com/article/659-history-of-the-gpu-part-4/

## The stack around it (visual 01-stack)

Bottom to top, the layers an AI team's work sits on:
1. The chip: an Nvidia GPU.
2. The driver and CUDA: the layer that lets software use the chip.
3. Nvidia's libraries on top of CUDA (the 10-K calls the collection "CUDA-X"). Three that matter for AI, in a sentence each:
   - cuDNN: "a GPU-accelerated library of primitives for deep neural networks", the building blocks of a neural network, tuned for Nvidia GPUs. Nvidia lists PyTorch, JAX and TensorFlow among the frameworks it accelerates. (developer.nvidia.com/cudnn)
   - NCCL (said "nickel"): "multi-GPU and multi-node communication primitives optimized for NVIDIA GPUs and networking", how many GPUs share their work during training. (developer.nvidia.com/nccl)
   - TensorRT: "an ecosystem of tools for developers to achieve high-performance deep learning inference", for running a trained model fast. (developer.nvidia.com/tensorrt)
4. The framework: PyTorch (or JAX, TensorFlow). This is what most AI researchers actually write in.
5. Your model code: the team's own work, written in the framework, plus anything custom they wrote straight in CUDA.

- The 10-K's own description: "While our approach starts with powerful chips, what makes it a full-stack computing platform is our large body of software, including the CUDA development platform, the CUDA-X collection of acceleration libraries..."
- On the board, layers 2 and 3 are one box, "CUDA + libraries", and the driver is not named. Say "the driver" only if asked.

## A framework can hide the chip, partly

- PyTorch runs on AMD GPUs through AMD's ROCm. PyTorch's documentation: "PyTorch for HIP intentionally reuses the existing torch.cuda interfaces", which "helps to accelerate the porting of existing PyTorch code and models". So plain PyTorch code written for Nvidia can often run on AMD with few changes. (PyTorch docs, HIP (ROCm) semantics)
- ROCm: "the AMD open software stack for GPU-accelerated computing". It is AMD's answer to the middle box. (AMD ROCm docs)
- HIPIFY is "a ROCm tool to help developers migrate GPU programming from NVIDIA's CUDA language to AMD's HIP C++". So code written straight in CUDA can be converted with help, not for free. (AMD HIPIFY docs)
- Explanation, not a reported fact: when a team writes only plain framework code, the rival chip's maker does most of the rebuilding, by supplying its own version of the middle box. What stays the team's job is everything below the framework that it added itself: custom CUDA code, performance tuning, tools, tests, and the people who know how to do that on Nvidia. This is the general shape engineers describe; there is no source here for how long any port takes, so never give a time or cost for one.

Sources:
- PyTorch, HIP (ROCm) semantics: https://docs.pytorch.org/docs/2.9/notes/hip.html
- AMD, What is ROCm?: https://rocm.docs.amd.com/en/latest/what-is-rocm.html
- AMD, HIPIFY: https://rocm.docs.amd.com/projects/HIPIFY/en/latest/

## Switching cost (visual 03-move)

- Explanation, not a reported fact: the cost of leaving Nvidia is not mainly the chip price. It is three things: the rewrite (custom code, tuning, tests redone on the new chip), the ecosystem (Nvidia's libraries, the tools, and years of answers on forums that only exist for CUDA), and the people (engineers hired because they know CUDA). The analogy for the session: changing the foundation of a house means re-checking everything built on it.
- The rival's chip being cheaper on 03-move is a premise for the question, a prop, not a claim about any real chip's price. Never say any real chip is cheaper or faster than any other.
- Nvidia's 10-K lists what it believes decides competition: "performance, breadth of product offerings, access to customers and partners and distribution channels, software support, conformity to industry standard APIs, manufacturing capabilities, processor pricing, and total system costs." Processor pricing is one item of eight; software support is another.

## Competitors exist, and when they win (visual 03-move, "set worth")

- Nvidia's 10-K names its competitors, including AMD, Huawei and Intel for chips, and "large cloud services companies with internal teams designing hardware and software", such as Alibaba, Alphabet (Google), Amazon, Baidu, Huawei and Microsoft. It also says competitors' products "may be cheaper or provide better functionality or features than ours, which has resulted and may in the future result in lower-than-expected selling prices or demand for our products."
- Google: TPUs are "Google's custom-developed, application-specific integrated circuits", and "code that runs on TPUs must be compiled by the accelerated linear algebra (XLA) compiler" (Google Cloud TPU docs). Google built its own framework too: JAX, "a Python library for accelerator-oriented array computation", whose code runs on "CPU, GPU, & TPU" (JAX docs). Google says it trained Gemini 1.0 "using Google's in-house designed Tensor Processing Units (TPUs) v4 and v5e" (Google blog, December 2023). So Google built the whole stack: chip, compiler, framework, and its own models to run on it.
- Amazon: AWS Neuron "is the software development kit for deep learning and generative AI on AWS Inferentia and AWS Trainium instances", Amazon's own chips, with native PyTorch and JAX support (AWS Neuron docs). Again: a new chip comes with its own middle box.
- Anthropic, 23 October 2025: plans to use "up to one million TPUs" from Google Cloud, and describes its compute as "three chip platforms: Google's TPUs, Amazon's Trainium, and NVIDIA's GPUs". (Anthropic announcement)
- OpenAI and AMD, 6 October 2025: OpenAI "to deploy 6 gigawatts of AMD GPUs based on a multi-year, multi-generation agreement"; "the first 1 gigawatt deployment of AMD Instinct MI450 GPUs is set to begin in the second half of 2026." (AMD press release) Don't say whether it has started: no source here for that.
- Explanation, not a reported fact: the pattern in these cases is that the buyers are very large, so a saving on chips is large enough to pay for building or adopting a new stack, and that the challenger supplies the middle box itself (XLA and JAX, Neuron, ROCm). The moat is not a wall; it is the price of moving, and it stops only the buyers whose saving is smaller than that price.

Sources:
- Google Cloud, Introduction to Cloud TPU: https://docs.cloud.google.com/tpu/docs/intro-to-tpu
- JAX documentation: https://docs.jax.dev/en/latest/
- Google, "Introducing Gemini", December 2023: https://blog.google/technology/ai/google-gemini-ai/
- AWS Neuron documentation: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/
- Anthropic, "Expanding our use of Google Cloud TPUs and Services", 23 October 2025: https://www.anthropic.com/news/expanding-our-use-of-google-cloud-tpus-and-services
- AMD, "AMD and OpenAI Announce Strategic Partnership to Deploy 6 Gigawatts of AMD GPUs", 6 October 2025: https://ir.amd.com/news-events/press-releases/detail/1260/amd-and-openai-announce-strategic-partnership-to-deploy-6-gigawatts-of-amd-gpus

## Not covered here

Share prices, valuation, market share, chip prices, export rules and China sales, antitrust, and any forecast. If asked, say it isn't in today's material, give the nearest fact above in a sentence, and go back to the beat.
