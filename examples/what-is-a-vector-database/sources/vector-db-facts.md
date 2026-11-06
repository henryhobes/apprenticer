# Vector database facts: the only facts to use

Every real-world claim in this session comes from this file. Facts were checked on 5 November 2026 against the sources cited under each section. The meaning map, its points, its numbers and the three help articles are props for the board, marked as props below: hold them constant, and say they are a toy if Nadia asks whether they are real.

## What an embedding is

- An embedding is a list of numbers that a model produces from a piece of text. OpenAI's guide: an embedding "is a vector (list) of floating point numbers. The distance between two vectors measures their relatedness. Small distances suggest high relatedness and large distances suggest low relatedness." (OpenAI, Embeddings guide, developers.openai.com/api/docs/guides/embeddings)
- Size: OpenAI's text-embedding-3-small returns 1,536 numbers per text by default, and text-embedding-3-large returns 3,072. (Same guide.)
- The model, not the database, turns text into numbers. The same embedding model must be used for the documents and for the question, or the points are on different maps. (A consequence of the definition above: distances only mean something between vectors from the same model.)
- Embedding models are trained on large amounts of text so that related texts get nearby vectors. (General description; training details vary by model and are not covered here.)
- No single number has a plain meaning like "animal-ness". Meaning is spread across all of them; what carries meaning is where a text lands relative to other texts. (General property of learned embeddings; say it this way, and never name what an axis means.)
- OpenAI's embeddings are normalized to length 1, and OpenAI recommends cosine similarity, noting the choice of distance function usually matters little. (Same guide.) Cosine similarity compares the direction of two vectors: close to 1 means pointing the same way.

## Similarity search

- Semantic search: embed the question with the same model, then return the stored texts whose vectors are nearest to it. This is nearest-neighbour search.
- Keyword search matches the words themselves. A question can share no words with the right answer ("card charged twice" against "refund a duplicate payment") and still land next to it on the map, because the model placed texts that mean the same thing close together. Equally, a shared word ("card") doesn't make two texts mean the same thing. (Illustration, not a benchmark: real systems often combine keyword and vector search, often called hybrid search, and keyword search stays useful where the exact string is the point, such as an error code or a product name. General practice, stated as such.)
- Exact search compares the question with every stored vector. pgvector's README: "By default, pgvector performs exact nearest neighbor search, which provides perfect recall." (github.com/pgvector/pgvector)
- At scale, databases build an approximate index that looks at only part of the data. pgvector: adding an approximate index "trades some recall for speed", and "you will see different results for queries after adding an approximate index." (Same README.) Recall here means the share of the true nearest neighbours that the search actually returns.

## How a vector database stores and retrieves

- A vector database stores each vector next to the thing it came from (a chunk of text, an ID, metadata such as the article title or date) and answers "give me the k nearest vectors to this one". pgvector, for example, is "open-source vector similarity search for Postgres", storing vectors alongside the rest of your data. (pgvector README.)
- Two common index types, both in pgvector: IVFFlat "divides vectors into lists, and then searches a subset of those lists that are closest to the query vector"; HNSW "creates a multilayer graph", with a better speed-recall tradeoff than IVFFlat but slower builds and more memory. (pgvector README.)
- HNSW comes from Malkov and Yashunin, "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs" (arXiv 1603.09320, 2016): a stack of proximity graphs, searched from the sparse top layer down to the dense bottom one. In plain words: hop from neighbour to neighbour, getting closer each hop, instead of checking everything.
- Distance measures pgvector supports include L2 (straight-line) distance, inner product and cosine distance. (pgvector README.)
- Documents are usually split into chunks (a paragraph or a section) before embedding, so that a search returns the passage that answers, not a whole manual. Chunk size is a design choice, not a standard. (Common practice, stated as such; no specific size is a fact.)

## RAG: retrieve, then generate

- Retrieval-augmented generation pairs a language model with an external store it searches at question time. The original paper: Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (arXiv 2005.11401, NeurIPS 2020), whose external memory "is a dense vector index of Wikipedia", searched by a neural retriever.
- The loop, as it is commonly built: ahead of time, chunk the documents, embed each chunk and store the vectors. At question time, embed the question, fetch the nearest few chunks, paste them into the model's prompt with the question, and the model writes an answer from them.
- The model is not retrained on the documents. It sees them only because they were pasted into this one request. Update a document and re-embed it, and the next answer can use it.
- If the right chunk isn't among those fetched, the model never sees it. It answers from whatever was fetched and from what it learned in training, which can be wrong and still sound sure. Retrieval quality limits answer quality. (A direct consequence of the loop; no measured failure rate is claimed.)
- Embedding models have a training cutoff too: OpenAI's v3 embedding models "lack knowledge of events that occurred after September 2021" (OpenAI Embeddings guide). They can still embed newer text; they may place unfamiliar new terms less well.

## Props (invented for the board, hold them constant)

- 01-map, the meaning map: a toy flattened to two dimensions, with no named axes. Points: dog, puppy, cat in one corner; car, truck in the other. The fingerprint under dog is "0.21, 0.83": two invented numbers standing for the 1,536 a real model gives. Kitten lands beside cat and puppy.
- 02-search and 03-rag, the help desk: three help articles, "Refund duplicate", "Update card" and "Reset password", and the question "card charged twice". On the map, the question lands nearest "Refund duplicate", with "Update card" at a middling distance and "Reset password" far off. Keyword search picks "Update card" because it shares the word "card". The positions are invented to illustrate the mechanism; no real model was run.
- 03-rag fetches the top three chunks. Three is a toy choice; real systems pick their own number.
