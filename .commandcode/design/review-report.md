# Review Report — Sharext dashboard

**Mode:** review · **Date:** 2026-11-17 · **Target:** `frontend/src/app/dashboard/page.tsx` + sidebar at `/dashboard`

**Score:** 24/50
**Verdict:** Block (accessibility), needs changes (design)

---

## First impression

It reads as a real product with live data, not a demo: brand blue, Balimo, working navigation, a clear primary action. The thing you remember, unfortunately, is a wall of identical white cards repeating ACTIVE. With 17 events, the page shows one decision (create an event) and no way to read the list.

The participated tab has the opposite problem: three polished cards for events the app never fetched. The polish is real; the content is staged.

## Hierarchy

The header is ordered well: title, description, tabs, primary action. Everything after the header is equal weight. Event name, status, and actions repeat on every card with nothing to anchor the eye: no dates, no photo counts, no recency, no distinction between a live album and a test event. On mobile a single card is taller than the viewport.

## Color voice

Brand blue is earned and used with discipline; amber appears only as an icon accent. The weak points are gradients that do not belong to the brand system: the blue→indigo profile avatar and the blue→blue-700 "View My Photos" button. They read as default AI chrome inside an otherwise flat palette.

## Type voice

Balimo gives the product a face and the page headings carry authority. The failure is scale discipline in the chrome: 10–11px labels in `slate-400` at 2.5:1, and an h1→h3 jump with no h2 in the list. The heading face is strong; the metadata is doing the opposite.

## Interaction feel

The primary flows work, but the join dialog is a visual modal and not a real one: Tab escapes it, Escape does nothing, the backdrop does not close it, and the field is labelled only by a placeholder. The error state tells the user what failed and offers no way forward. The copy-link action confirms by swapping an icon, which assistive tech never hears.

---

## Scoring

| Lens | Score |
|---|---|
| First impression | 5/10 |
| Hierarchy | 4/10 |
| Color voice | 6/10 |
| Type voice | 5/10 |
| Interaction feel | 4/10 |
| **Total** | **24/50** |

---

## Priority findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Layout | `dashboard/page.tsx:262-329` | 17 identical cards; no date, count, or priority | Bordered ledger with a header row and compact rows | The dashboard has no scan path |
| 2 | HIGH | Accessibility | `dashboard/page.tsx:332-393`, `Sidebar.tsx:550-614` | Not a dialog: no role, no Escape, no trap, placeholder-only field, unnamed 24px close | Shared dialog with semantics, label, trap/restore, Escape, 44px controls | The core join flow is unusable by keyboard and screen reader |
| 3 | HIGH | Accessibility | `Sidebar.tsx:228, 288, 400` | 11px `slate-400` at 2.5:1 | 11px `slate-500` at 4.8:1 | Metadata is illegible |
| 4 | MEDIUM | Composition | `dashboard/page.tsx:111-133` | Pill tabs wrap at 390 and have no `aria-current` | Flat tab bar with counts and underline | Header rhythm breaks; state is visual only |
| 5 | MEDIUM | Interaction | `dashboard/page.tsx:156-173` | Dead error banner | Alert + retry | No recovery path |
| 6 | MEDIUM | Writing | `Sidebar.tsx:130-135` | Three premiums in one nav item | "Photos" + Premium badge | Redundant, noisy label |
| 7 | MEDIUM | Type | `dashboard/page.tsx:196, 282` | h1 → h3 | h2 event names | Broken outline |
| 8 | MEDIUM | Color | `Sidebar.tsx:531`; `dashboard/page.tsx:215` | Blue→indigo and blue→blue-700 gradients | Flat brand blue | Generic tech gradient |
| 9 | MEDIUM | Accessibility | `dashboard/page.tsx:303-313` | Copy confirmation is icon-only | Live region + aria-label | Assistive tech misses it |
| 10 | LOW | Decoration | `dashboard/page.tsx:239-247` | Sparkles tile above the empty-state heading | Inline icon | Icon topper |
| 11 | LOW | Motion | `Sidebar.tsx:540-543` | Pulsing Active User dot | Remove | Fake live status |

---

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| Participated events data | Replacing the three hardcoded events with an API call | There is no participated-events endpoint; it is a product change beyond this pass |
| Sidebar | Removing the profile block | Shared app chrome with a working destination |
| Palette | New brand hue | `#0053FF` is the logo and hero color |
| Card hover | Deleting hover elevation | It is the only affordance on the cards; the ledger replaces it instead |
| Test event names | Renaming `mail`, `test2`, `Invalid File Test` | Database fixtures, not design |

---

## Recommendations, in order

1. **`/design relayout`** — event ledger with real columns and one primary action per row.
2. **`/design a11y`** — one dialog component with semantics, focus management, a visible label, and 44px controls.
3. **`/design typeset`** — 11px `slate-500` chrome floor and an h2 event outline.
4. **Interaction** — retry on error, `aria-current` on tabs, live copy confirmation.
5. **`/design recolor`** (scoped) — remove the two blue→indigo gradients.

---

## Verification

Ran: 1440 and 390 renders; both tabs; open-dialog screenshot; CDP measurements; backend health `200`; code inspection.

- 2.5:1 contrast on sidebar labels; control heights from 17 to 42px.
- No dialog semantics; Escape leaves the overlay open.
- **Not verified:** reader announcements; iOS zoom on hardware.

---

## Verdict

**Block** — the join flow fails keyboard and screen-reader access. The visual direction is sound; the composition and the chrome need the fixes above, not a new direction.
