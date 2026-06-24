# CC Brief — Link roleplay books to hexes (place-arrival surfacing)

## Goal

Let a hex feature reference a **roleplay book**, so arriving at the place surfaces the
book as a reminder. This adds _place-arrival_ as a second surfacing trigger for books,
which today surface only on encounter pages (when a relevant NPC is in a scene). It closes
the gap where the party walks into a place that is cue enough on its own — the fort, the
dragonborn town — without the matching encounter being run, and the book never comes up.

This is the same reference shape as the `beats` field just added, on the same two
surfaces. Conceptually it does **not** re-anchor relational beats to hexes: we link the
_book_ (the container), not the beats inside it. The beats keep their relational trigger
and single home in the book.

## Read first (do not infer)

- `../hexcrawl-manager/packages/schemas/src/schemas/roleplay-book.ts` — the book schema
  and its ID/reference format, plus the `LinkTypeEnum` (is there a `'roleplay-book'` link
  type to reuse?). The new field's element format must match how books are referenced
  elsewhere.
- `hex.ts` — mirror the `beats` field added in the prior pass (same array style, same two
  locations).
- The just-completed beat-surfacing logic in `move` / fast-travel (`scribe`/`weave`) and
  the encounter-page book-surfacing logic — this feature extends both consumers; mirror
  what exists rather than reconstructing it.

## Change 1 — Schema (code repo)

Add an optional `roleplayBooks` reference array to:

- `LandmarkSchema`
- `BaseHiddenSiteSchema` (the base — so all three site variants inherit; not the union)

Mirror the `beats` field's array style. Elements are book references in the canonical book
format from `roleplay-book.ts`. No top-level field on `HexSchema` — books anchor to a
place-feature, same as `beats` and `clues`.

Validation: each referenced book ID must resolve to an existing roleplay book; fold into
the existing reference-validation sweep.

Direction stays one-way: hex → book. Do **not** add a `hexes` field to the book schema;
"which hexes remind this book" is derived by querying hexes.

## Change 2 — Surfacing (code repo)

Two consumers, both mirroring how `beats` were wired:

- **Hex detail view (pull):** resolve and display referenced books (title + one-line "what
  this book delivers"), the way linked clues/beats already render.
- **CLI movement (push):** on `move` and fast-travel, surface referenced books for the
  hex(es) as a **reminder line** — e.g. "Roleplay book relevant here: _Fort Dagaric
  Tidings_." Fast-travel is again the higher-value trigger (intervening hexes the GM is
  skipping).

**Grain — surface the book, not its contents.** Emit a reminder that the book is relevant
here; do not expand the book's beats/tidings into the output. The GM opens the book and
selects what to deliver. Auto-expanding would re-implement relational surfacing and flood
the channel.

Gating: check `roleplay-book.ts` for any active/eligibility field on books. If books are
always-relevant reference material, surface all linked books. If there's an eligibility
gate, respect it — but there is **no** per-beat status predicate at this layer (unlike the
beat-surfacing brief); the book is surfaced whole, as a pointer.

## Change 3 — Data

- **Fort Dagaric — link now (in scope).** Add the Fort Dagaric tidings/rumors roleplay
  book to the Fort Dagaric hex's `landmark.roleplayBooks`. This is the place-bound case:
  the fort is the delivery point, so the hex link is the book's primary trigger. (Confirm
  the Fort Dagaric hex ID and book ID from the repo — do not guess them.)
- **Secessa (`j7`) — deferred (contingent).** The intended link is `j7` → a
  dragonborn-diaspora book as an _additive reminder_ at a strong locus. That book is still
  a pending authoring decision; **do not create it here.** If the diaspora book already
  exists, link it; if not, leave `j7` untouched and note the pending link. Out of scope to
  resolve the diaspora-book decision in this brief.

## Change 4 — Docs

The placement guide (`docs/clue-and-beat-placement-guide.md`) has been updated by Alex
with a "Linking roleplay books to hexes" section (place-bound vs. additive-reminder,
link-the-book-not-the-beat, surface-as-reminder). Incorporate that content; the existing
CLAUDE.md pointer already covers it — extend the pointer's one-liner only if the field
names warrant it (`landmark.roleplayBooks` / `hiddenSites[].roleplayBooks`).

## Out of scope / logged, not built

- **Presence-declaration scale path.** If book→hex reminders ever need to scale past a
  handful of strongholds, the non-drifting version is _not_ hex→book — it's the hex
  declaring which faction/entity is present (a true fact about the place), with surfacing
  deriving books, relational beats, and faction tidings alike from that one declaration.
  Demonstrated need is ~2 links now; log this as the scale path and do not build it.

## Confirm back to Alex

- Book reference element format from `roleplay-book.ts` (flat slug vs. compound; reuse of
  any `'roleplay-book'` LinkType).
- Whether books carry an active/eligibility gate, or are always surfaced when linked.
- Fort Dagaric hex ID + book ID to wire in Change 3.
- Reminder-line treatment in movement output: same block as beats, or its own labeled
  "Books relevant here" line (recommend its own line).
