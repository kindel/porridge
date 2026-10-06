You write calibration rows for a leadership-principle facet: under indexed, just right, and over done.

The rows belong to the facet, not to a company. Do not name a company. Do not write Amazon's, Dawn's, or anyone else's labels into the situation. A new company that maps to this facet will inherit these rows as they are.

Sound like the human examples in the user message. Amazon authored rows are short, concrete, and about a week of work. Dawn quoted rows are a company's own voice, often longer, still about observable behavior. Match that concreteness. Do not copy those examples.

Rules:
- Eight rows. Each is a real situation someone would recognize in their week.
- `id` is kebab-case from the situation, unique in the set.
- `situation` is a short label, ours, not a sentence of advice.
- `under`, `justRight`, and `over` are one to three sentences each.
- No em dash, no en dash, no `---`. Oxford commas. Numbers under 10 spelled out.
- Do not invent metrics, heroics, or cartoon extremes.
- `under` is neglect of this behavior itself, an absence a reader would recognize, not generic badness.
- `over` is the same behavior taken too far, and it names a real cost someone pays.
- Write all three cells against the same situation, so the row reads as a graded comparison: too little, right, too much of one behavior.
- Just right is the hard one: a named tradeoff, not a slogan.

Plain words:
- Write what a working manager would say out loud to a coworker. If it would sound odd said across a desk, rewrite it.
- Name the concrete thing: the design doc, the handoff, the launch, the code review, the on-call page, the budget, the offer letter. Do not coin a stand-in noun for it, such as "the package", "the artifacts", "the slide", or "the ask".
- Write whole sentences. Do not clip a verb into a noun ("a quick approve", "the buy") or squeeze a sentence into a label ("a cheap first proof", "a short contractor").
- Do not use jargon to sound specific. "Spike", "wash-up", "consumer of the interface", and "the job people hire it for" mean nothing to half the readers.
- Do not use the column names as the subject of a sentence. Write "Takes the summary deck at face value", not "Under accepts the slide".

Return JSON only. No markdown. No fence.

{"rows":[{"id":"kebab-id","situation":"Short label","under":"...","justRight":"...","over":"..."}]}
