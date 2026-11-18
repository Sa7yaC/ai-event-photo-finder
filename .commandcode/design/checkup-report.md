# Checkup Report — Sharext dashboard

**Mode:** checkup · **Date:** 2026-11-17 · **Target:** `frontend/src/app/dashboard/page.tsx` + `frontend/src/components/{Sidebar,DashboardLayout}.tsx` at `/dashboard`

**Score:** 30/60
**Verdict:** Block

---

## TL;DR

The primary task is legible and the data is live, but two systems are not shippable. The join dialog is not a dialog: no role, no Escape, no focus trap, no label on its field. Sidebar labels sit at 2.5:1 contrast on 11px type. The event area is 17 identical cards with no scanning information, so the dashboard cannot be read as a dashboard.

---

## Vitals

| # | Vital | Status | Score | Evidence |
|---|---|---|---|---|
| 1 | Intentionality | Watch | 5/10 | Custom brand palette, but the event grid is an equal-card template and the empty state adds an icon topper |
| 2 | Readability | Watch | 5/10 | Body copy is readable; sidebar labels are 11px at 2.5:1 and subtext is 10px |
| 3 | Usability | Watch | 5/10 | Primary actions are clear; the join dialog has no exit affordances and the error state has no retry |
| 4 | Responsiveness | Watch | 5/10 | No overflow at 390; tabs wrap to two lines and the modal input is 14px (iOS zoom trigger) |
| 5 | Speed | Healthy | 10/10 | Live list loads without image payload; skeletons cover the wait |
| 6 | Accessibility | Critical | 0/10 | No dialog semantics or focus containment, unlabelled field, unnamed close, low-contrast labels, small targets |

**Total: 30/60**

---

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Accessibility | `dashboard/page.tsx:332-393`, `Sidebar.tsx:550-614` | No `role="dialog"`, no `aria-modal`, no Escape, no focus trap/restore; input label absent; close 24×24 unnamed | Shared dialog component with semantics, visible label, Tab loop, Escape/backdrop close, 44px controls | Keyboard and screen-reader users cannot identify or leave the dialog |
| 2 | HIGH | Accessibility | `Sidebar.tsx:228, 288, 400, 274, 379` | 11px `slate-400` on `#fbfbfb`; 10px subtext at the same tone | 11px `slate-500`; delete the subtext | 2.5:1 contrast is unreadable for low-vision users |
| 3 | HIGH | Layout | `dashboard/page.tsx:262-329` | 17 equal cards, 348×270, same ACTIVE pill and actions | One ledger with a header row and compact rows | The page cannot be scanned or prioritized |
| 4 | MEDIUM | Interaction | `dashboard/page.tsx:156-173` | Error banner with no action | `role="alert"` + "Try again" | Failure has no recovery path |
| 5 | MEDIUM | Interaction | `dashboard/page.tsx:111-133` | Active tab is fill-only; no `aria-current`; wraps at 390 | Underline + count, `aria-current="page"`, horizontal scroll | State is not announced and the header breaks on mobile |
| 6 | MEDIUM | Type | `dashboard/page.tsx:196, 282` | h1 → h3 heading jump | Event names as h2 | Broken heading outline |
| 7 | MEDIUM | Accessibility | `Sidebar.tsx:176-182, 289-312, 418-424`; `dashboard/page.tsx:303-313` | 17–38px targets | ≥36px dense chrome, ≥40px copy, 44px modal | Below the touch floor |
| 8 | MEDIUM | Accessibility | `dashboard/page.tsx:303-313` | Copy feedback is icon-only, no live announcement | `aria-label` + polite live region | Screen readers miss the confirmation |
| 9 | LOW | Motion | `Sidebar.tsx:540-543` | Pulsing "Active User" dot | Remove | Decorative motion claiming live state |
| 10 | LOW | Decoration | `dashboard/page.tsx:239-247` | 64px Sparkles tile over the empty-state heading | Inline icon in the CTA | Icon topper |

---

## Prescriptions

- **Composition** → `/design relayout`: replace the event card wall with a ledger, one surface, rows with name, status, date, actions.
- **Accessibility** → `/design a11y`: extract one `JoinEventModal`; dialog semantics, visible label, 16px input, focus trap and restore, Escape, 44px controls.
- **Readability** → `/design typeset`: 11px `slate-500` floor for chrome labels; remove duplicate subtext.
- **Interaction** → add a retry to the error state and `aria-current` to the tabs.

---

## Verification

Ran: 1440 and 390 renders; screenshots of both tabs and the open dialog; CDP measurement of computed sizes/colors, control boxes, dialog role, Escape behavior, body overflow; backend health `200`; `tsc --noEmit`; `eslint`.

- Contrast: `#94a3b8` on `#fbfbfb` = **2.5:1**.
- Control heights: 17, 22, 24, 28, 38, 42.
- Modal: no dialog role; Escape does not close; background remains scrollable.
- No horizontal overflow at 390 (`scrollWidth` 390).
- **Not verified:** screen-reader announcements beyond `aria-live`; iOS Safari zoom on a physical device.

---

## Verdict

**Block** — the dialog and the low-contrast chrome are accessibility failures, and the event surface has no scanning structure.
