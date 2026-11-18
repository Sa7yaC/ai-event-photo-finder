# Smell Report — Sharext dashboard

**Mode:** smell · **Date:** 2026-11-17 · **Target:** `frontend/src/app/dashboard/page.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/DashboardLayout.tsx` (`/dashboard`, `/dashboard?tab=participated`)

**Score:** 5/10 — PRESENT
**Verdict:** Needs changes

---

## TL;DR

The chrome is disciplined product UI, not a template: one brand blue, one amber accent, Balimo, live data. The event area is the tell. Seventeen equal cards repeat one status pill and one action pair, with no date, count, or priority. That is the feature-tile reflex applied to a monitor/compare task.

The join dialog is assembled from defaults: no dialog semantics, an unlabelled 14px field, and a 24px close button with no name.

Brand blue is earned (logo and hero) and Balimo is the local brand face. Neither is reported as a smell.

---

## Heuristics

| # | Odor | Present | Evidence |
|---|---|---|---|
| 1 | Tech gradient | 0 | Avatar `blue-500 → blue-600 → indigo-500`; CTA `#0053FF → blue-700` |
| 2 | Generic tech hue | 1 | `#0053FF` is the product mark, used in the logo and hero |
| 3 | Feature tile grid | 0 | 17 equal cards at `:262-329`, no priority or differentiation |
| 4 | Accent rail | 1 | None present |
| 5 | Unearned blur | 1 | Blur is limited to the modal scrim and mobile header |
| 6 | Stat monument | 1 | Counts are contextual (24 found, 3 joined), not hero stats |
| 7 | Icon topper | 0 | Empty state puts a 64px Sparkles tile above the heading (`:239-247`) |
| 8 | Bounce everywhere | 1 | No bounce; one decorative pulse dot reported LOW |
| 9 | Default type | 1 | Balimo is loaded locally and carries the brand |
| 10 | Center stack | 1 | Page is left-aligned; only the empty state centers |

**Tells found:** 3 — feature tile grid, icon topper, tech gradient.

---

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Layout | `dashboard/page.tsx:262-329` | 3-column grid of 17 identical 348×270 cards; every card repeats the same ACTIVE pill and the same two actions | One bordered ledger: a column header plus ~64px rows with name, status (dot + text), date, and right-aligned actions | A monitor/compare surface rendered as an equal-card wall; nothing differentiates 17 events |
| 2 | HIGH | Accessibility | `dashboard/page.tsx:332-393`, `Sidebar.tsx:550-614` | Plain `<div>` modal: no `role`, no Escape, no backdrop close, no focus trap or restore; 14px placeholder-only input; 24×24 unnamed close | One shared `JoinEventModal`: `role="dialog"`, `aria-modal`, visible label, 16px input, Tab loop, Escape/backdrop close, 44px controls | Keyboard and screen-reader users cannot identify, contain, or exit the dialog |
| 3 | HIGH | Accessibility | `Sidebar.tsx:228, 288, 400, 274, 379` | 11px `slate-400` labels on `#fbfbfb` = 2.5:1; 10px subtext at the same contrast | 11px `slate-500` (4.8:1); remove the duplicate subtext | The labels are decorative at that contrast |
| 4 | MEDIUM | Composition | `dashboard/page.tsx:111-133` | Pill tabs wrap to two lines at 390px; active state is fill-only, no `aria-current` | Flat tab bar with counts and an active underline; `aria-current="page"`; horizontal scroll on mobile | The header rhythm breaks and state is not announced |
| 5 | MEDIUM | Interaction | `dashboard/page.tsx:156-173` | Static error banner with no action; skeleton is card-shaped | `role="alert"` with a "Try again" button; row-shaped skeleton | A failure with no recovery path |
| 6 | MEDIUM | Writing | `Sidebar.tsx:130-135` | "Photos (uploaded & downloaded)" + "(for premium users)" + Premium badge | "Photos" + Premium badge | The same fact three times |
| 7 | MEDIUM | Type | `dashboard/page.tsx:196, 282` | h1 → h3; event names are h3 with no h2 | Event names as h2 | Heading order skips a level |
| 8 | MEDIUM | Accessibility | `Sidebar.tsx:176-182, 289-312, 418-424`; `dashboard/page.tsx:303-313` | 17–28px section toggles and add buttons; 38px copy button | ≥36px dense chrome, ≥40px copy | Targets below the touch floor |
| 9 | MEDIUM | Color | `Sidebar.tsx:531`; `dashboard/page.tsx:215` | Blue→indigo avatar; blue→blue-700 CTA | Flat `#0053FF`; keep the amber icon accent | Generic tech gradients inside an earned palette |
| 10 | MEDIUM | Accessibility | `dashboard/page.tsx:303-313` | Copy button named only by `title`; copied state swaps an icon silently | `aria-label` with the event name plus a polite live region; 40px target | The confirmation is invisible to assistive tech |
| 11 | LOW | Decoration | `dashboard/page.tsx:239-247` | 64px Sparkles tile above the empty-state heading | Remove the tile; inline icon in the CTA | Icon topper |
| 12 | LOW | Motion | `Sidebar.tsx:540-543` | Pulsing green dot beside "Active User" | Remove the pulse and the fake status line | Motion that claims live state that does not exist |

---

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| `dashboard/page.tsx:36-64`, `Sidebar.tsx:53-76` | Hardcoded participated events | Demo scaffold until a participated-events API exists; replacing it is a product/data change, not a visual one |
| Palette | Replacing brand blue with an unexpected hue | `#0053FF` is the logo and hero color; changing it breaks the page identity |
| Event names in the DB (`mail`, `test2`, `Invalid File Test`) | Cleaning test fixtures | Content hygiene, not a design decision |
| Sidebar structure | Removing the profile and logout block | Functional chrome shared across the app |
| Empty state | Re-centering or removing the panel | Centering is valid for an empty state; only the icon topper above it is the smell |

---

## Verification

Ran: `/dashboard` and `/dashboard?tab=participated` at 1440 and 390; screenshot of the open join dialog; CDP measurement of computed font sizes, colors, control boxes, dialog semantics, and Escape behavior; backend health check (`200`); source inspection.

- Sidebar labels render 11px `slate-400`; measured contrast **2.5:1** on `#fbfbfb`.
- Control boxes: collapse 28×28, section toggle 178×17, add 22×22, copy 38×38, modal close 24×24.
- Dialog: no `role="dialog"`, no focus trap, Escape leaves the overlay mounted, body scroll not locked.
- 17 event cards, all with the same status and actions; no date column.
- **Not verified:** screen-reader reading order of the sidebar, full keyboard traversal after the fix.

---

## Verdict

**Needs changes** — the identity survives, but the event composition and the dialog are unearned defaults. Fix composition first, then the dialog, then the chrome.
