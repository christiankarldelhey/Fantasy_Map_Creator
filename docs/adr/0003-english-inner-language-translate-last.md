# English is the inner language; other languages are a final translation

The Mind Engine thinks and narrates in one language, English: the World voice, Memories, Beliefs, the Lens and the narration itself are all English. When a reader asks for another language (Spanish today), the finished English narration is translated in a separate last step. The narrator is never asked to write directly in the target language.

We chose this because Resonated is measured on the narration: each Lens line is compared with the prose that followed it. With an English Lens and a Spanish narration the literal echo check scored zero, and the current embedder is a lexical hash, not a semantic model, so it can't bridge languages either. Narrating in English keeps that measurement literal, free and deterministic in every language. It also keeps the before/after comparison of the new Lens meaningful whatever language the game is played in.

## Considered Options

- **Narrate directly in the target language and accept Resonated only in English**: no extra call, but the Studio's main diagnostic goes blind for most real play.
- **Narrate directly and measure with multilingual semantic embeddings**: one consistent yardstick, but it adds a heavy local model or a network dependency only to measure.
- **An LLM judge for Resonated**: no new dependency, but an extra call per Episode and weaker reproducibility.

## Consequences

- A non-English Episode costs one extra LLM call (the translation), and some prose texture may be lost in translation.
- The Studio can show both the English narration and its translation.
- Authored text that reaches the narrator (World voice, Accents, Foundational phrase) must be written in English.
