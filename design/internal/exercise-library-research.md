# Exercise library — research (phase 4a)

Researched 2026-11-23 for SISTEMA-INTERNO.md §4a. Rule from the spec: switch only if a
candidate is clearly better for a coach building routines fast and a client
understanding the movement.

## Comparison

| | Current library (from Sport Lab) | free-exercise-db | wger | ExerciseDB (AscendAPI) |
|---|---|---|---|---|
| **License (data)** | Ours: names and categories written for the gym | Unlicense, "Open Public Domain Exercise Dataset" | Per exercise, mostly CC-BY-SA (3.0 or 4.0): attribution + share-alike | Proprietary; paid subscription |
| **License (media)** | YouTube videos, embedded (not hosted) | Not documented. Maintainer said "no problems at all" in issue #12 but never stated a source or license; README credits an older dataset (wrkout) | Per image; some from Wikipedia with their own terms | Revocable license during the subscription only; storing media is forbidden |
| **Self-host media** | No need (YouTube) | Technically yes, legally unclear | Per file, with attribution | No |
| **Media type** | Video | 2 still photos per exercise | Photos, some videos | GIFs |
| **Instructions** | None | Yes, English | Yes, several languages | Yes, English |
| **Muscles / equipment / level** | Category only (Piernas, Pecho…) | Primary + secondary muscles, equipment, level, force, mechanic | Muscles, equipment, category | Target, equipment, body part |
| **Spanish** | Names already in Spanish/gym usage | No | Partial, community translations | No |
| **Size** | 38 | 800+ | Several hundred, uneven quality | 1,300+ |

## Recommendation

**Keep the current library and enrich it.** None of the candidates is clearly better
for this gym:

- **ExerciseDB** is out: paid, revocable, and its terms forbid storing the media.
- **wger** would need per-exercise and per-image attribution in the app and the PDF,
  share-alike obligations, and Spanish is incomplete.
- **free-exercise-db** has the best data shape and a clean license for the text, but
  its images have no documented origin. Shipping them in a paid product on an
  "issue closed, no problems" answer is a risk for Jeremy, not for the dataset.
  Its instructions are English and would need translating and reviewing exercise
  by exercise.

What makes the library good for ticofit is that the videos are the ones the coaches
already send over WhatsApp. So phase 4 keeps that and adds what was missing:

1. **Structured fields on every exercise**: muscle groups (Spanish labels, one map in
   code), equipment, level and instructions in Spanish. The 38 current exercises are
   tagged by hand from their names; instructions stay empty until a coach writes them.
2. **Coaches add their own exercises with their own video** (upload or YouTube link):
   the replacement for sending videos one by one over WhatsApp.
3. **Search in Spanish with synonyms** ("espalda" finds dorsales, trapecio, lumbares…),
   filters and favorites per coach.

If later a source is cleared in writing (e.g. the free-exercise-db author confirms the
image origin), its metadata can be imported into the same columns.

## Sources

- free-exercise-db README: https://github.com/yuhonas/free-exercise-db
- free-exercise-db image license question: https://github.com/yuhonas/free-exercise-db/issues/12
- wger README (data under Creative Commons, per entry): https://github.com/wger-project/wger
- wger documentation: https://wger.readthedocs.io/
- ExerciseDB API terms of use: https://exercisedb.notion.site/ExerciseDB-API-Terms-of-Use-226983b728ca8090bf7be79564e4b356
