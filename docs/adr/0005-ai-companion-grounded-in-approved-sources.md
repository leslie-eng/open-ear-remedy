# The AI Companion draws on approved sources through retrieval, not training

The AI Companion is grounded in mental-health books by retrieval (RAG): sources are split into passages, embedded with `openai/text-embedding-3-small` through OpenRouter, stored in Neon with pgvector, and the closest 4 passages are shown to the model alongside each message. We chose this over fine-tuning because it costs a fraction as much, sources can be added or withdrawn at any time, and each reply can name what it drew on.

The Companion stays **non-clinical** whatever the sources say: it never diagnoses or advises on medication, and retrieved text is passed as reference material that cannot override its rules. A server-side check of each message flags Crisis Help for suicide, self-harm, harming others and abuse, independently of the model.

## Considered Options

- **Fine-tuning on psychiatry textbooks**: rejected for cost, no way to cite or withdraw a source, and copyright: commercial textbooks may only be used with written permission.
- **Using real client conversations as data**: rejected. It is sensitive health data under Kenya's Data Protection Act 2019, and people confide in the Companion expecting nobody reads it.

## Consequences

- A source is searched only when a qualified professional has approved it (their name is recorded) and an Admin has switched it on; its licence is recorded too.
- Chat text is never stored. Usage is logged as source and time only.
- Changing the embedding model means removing and re-adding every source; search skips sources made with another model.
- Before switching RAG on in production, and after adding sources or changing the model, run `npm run review:companion -w @openear/api` and have the professional review the output. `RAG_ENABLED=false` switches search off at once.
- Measured cost: about US$0.0003 per reply with sources, roughly 10% of what a 1-Credit message earns.
