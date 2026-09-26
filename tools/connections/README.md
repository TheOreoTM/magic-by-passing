# Connections AI authoring tool

This local tool asks one OpenRouter model to compose Connections boards from a curated catalogue,
runs deterministic structural and alternate-group checks, and asks a second model to critique the
surviving drafts. By default it only prints them; with `--save-date`, it can save one selected
candidate to PostgreSQL as an unapproved draft. It never approves a puzzle.

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

Generate candidates, choose one interactively, and save it as a future draft:

```bash
npm run connections:generate -- --count 3 --theme "characters and magic" --save-date 2026-10-01
```

The save prompt shows each candidate's recommendation and fairness score. Saving requires
`DATABASE_URL`, never approves the puzzle, and asks for an explicit `REPLACE` confirmation if the
date already contains a draft. Review and edit the result in `/admin/connections` before approval.

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
- Generated drafts may be saved into the existing admin workflow, but must still be reviewed and
  explicitly approved there.
