# Connections AI authoring tool

This local tool asks one OpenRouter model to compose Connections boards from a curated catalogue,
runs deterministic structural and alternate-group checks, and asks a second model to critique the
surviving drafts. It prints drafts only. It does not write to PostgreSQL or approve a puzzle.

## Setup

Add the key to `.env.local` without a `NEXT_PUBLIC_` prefix:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
```

Optional model overrides:

```dotenv
CONNECTIONS_GENERATOR_MODEL=google/gemini-3.1-flash-lite
CONNECTIONS_CRITIC_MODEL=openai/gpt-5-mini
```

Run the default Season 1 generation:

```bash
npm run connections:generate
```

Request between one and five candidates or suggest a theme:

```bash
npm run connections:generate -- --count 3 --theme "characters and magic"
```

Limit the allowed anime material:

```bash
npm run connections:generate -- --season 1 --episode 14
```

The catalogue lives in
`src/features/connections/generation/catalog.ts`. Every category is an exact, human-authored group
of four with a spoiler boundary and source note. Add or correct catalogue content before asking the
model to use it; never treat the model's memory as a canon source.

## Safety boundaries

- Keep `OPENROUTER_API_KEY` server-side and use a key with a spending limit.
- Model output is parsed against a strict schema and then checked by the existing puzzle validator.
- A candidate is rejected when it repeats a tile, exceeds the spoiler boundary, or creates another
  complete catalogue category from the same sixteen tiles.
- The critic is advisory. Every candidate still requires human canon, localization, ambiguity,
  spoiler, and mobile-layout review.
- Generated drafts must be entered through the existing admin workflow and explicitly approved.
