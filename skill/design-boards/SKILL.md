---
name: design-boards
description: Plans and builds the board visuals (visuals/*.html) of an Apprenticer teaching space, then checks them in the preview. Use at step 3 of author-a-teaching-space, or to add or fix a board in a space under examples/. Not for drawing a one-off chart outside a space.
---

# Designing the boards

The rules are the apprenticer skill's "The board", "Style", "Cue words and `set` moves", "The note" and "Skeleton": read them now. This is the order to apply them in, with what the catalog examples do.

## Plan, then build

1. List two to four boards, one line each: id (`01-stack`), the one idea it shows, the beat it goes up in, its moves, and the real numbers on it with the line of sources/ they come from. One board per prediction is usual; the close reuses the first one. No numbers in sources/, no board.
2. Build each as `visuals/NN-id.html`, from the Skeleton. Use the kit's shapes (chain, numbers, compare, calc, split, a toy mechanism) so they look like the mind's drawings.

## What every board gets right

- **The note is the contract.** It opens the file: the title as its first sentence, then the beats it serves, what's on it part by part, its cue words in the order the voice says them, each move in double quotes with what it changes and when to make it, and the numbers on it, so the mind reads them instead of inventing them. See `examples/what-is-nvidias-moat/visuals/01-stack.html`.
- **Cues match the script.** The brief's scripted line says the steps' cue words in step order ("At the bottom, an Nvidia GPU. On it, CUDA... On that, PyTorch").
- **Reveals are `set` moves.** The answer to a prediction waits for a move ("set swap", "set count"), made in the turn after they answer. The board holds still until then and never shows the answer early.
- **The close board.** Its labels' cues include the words the learner is likely to use in the explain-back ("librar", "framework"), not only the board's own nouns.
- **One gold thing** in each state a move can reach: when a move brings a new focus, the gold leaves the old one.
- **Props say so** in the note ("a premise, not a real price: say so"), matching the line in sources/.

## Look at it

1. `node bin/apprenticer.ts check examples/<name>` and fix every error.
2. `node bin/apprenticer.ts preview examples/<name>` (no API key): for each board press Next part, type the opening line into the box to test its cues, press every move's button, and try `set labels off` then type the explain-back words. Fix what doesn't come up, overlaps or reads small.
3. Reread each note against the brief: a scripted line that changed orphans a cue.
