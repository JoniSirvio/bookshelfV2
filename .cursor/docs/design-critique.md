# BookShelf V2 — Design Critique

**Date:** March 2025  
**Scope:** Main app (screens, components).  
**Reference:** frontend-design skill (DO/DON'Ts), Design Context in `.cursorrules`, theme.ts, audit-report.md and subsequent work (normalize, harden, adapt, onboard, animate, bolder, polish).

---

## Anti-Patterns Verdict

**Verdict: Pass with caveats — does not read as generic “AI slop,” but not yet unmistakably distinctive.**

- **No AI color palette:** No cyan-on-dark, purple-to-blue gradients, neon accents, or gradient text. Olive green leads; red is reserved for destructive actions. **Good.**
- **No glassmorphism:** No decorative blur or glow. **Good.**
- **No hero-metric template:** No “big number, small label, gradient accent” dashboard pattern. **Good.**
- **Typography:** Plus Jakarta Sans is used app-wide (display Bold, body Regular) via theme tokens; typography is now distinctive and hierarchical. **Done.**
- **Pure white:** Theme uses tinted surface (`#F5F4F0`) and surfaceVariant; screens and modals use `colors.surface`. Pure white still appears in a few spots (e.g. some list backgrounds). **Mostly addressed.**
- **Modals:** ConfirmDelete, Review, BookOptions, FilterSort, Login, AskAI, Player — many flows are modal-heavy. Frontend-design: “Don’t use modals unless there’s no better alternative.” On mobile, confirmations and full-screen player are reasonable; the volume of modals still makes the product feel “modal-first” rather than “flow-first.” **Minor tell.**
- **Rounded rectangles + shadow:** Cards and CTAs use consistent radius (12–16) and olive-tinted shadow on primary button. Not the “generic gray drop shadow on every card” pattern; shadow is purposeful. **Acceptable.**
- **Gray on color:** Recommendation and shelf badges use primary-tinted text (`colors.primary`) on light green (`bgRec`); no gray-on-colored-background washout. **Good.**

**The test:** If you said “AI made this,” someone might guess it was tool-assisted (consistent tokens, clear structure) but would not immediately think “generic 2024 AI UI.” The olive+beige, Finnish copy, and restrained motion read as intentional. The typography gap is closed; the remaining opportunity is one clear “signature” moment — something that makes the app unmistakably BookShelf.

---

## Overall Impression

**What works:** The app feels calm, warm, and task-focused. The palette is coherent; empty states explain and guide; primary actions (e.g. “Hae suosituksia,” “Siirry kirjoihin”) are easy to find. Hierarchy (display vs section vs body) is clear. Accessibility and reduced motion have been considered.

**What doesn’t:** There is no single “hero” moment that defines the experience. Modals still dominate the interaction model. Two remaining gaps: discovery of "Kirjat" (where to add books) and success feedback after add or mark read.

**Biggest opportunity:** Own one signature moment — either the empty shelf, the “Luettavien hylly” header, or the first time a user sees recommendations — and make it unmistakably “this is my library, not another reading app.” That could be type, one bold layout choice, or a deliberate micro-interaction.

---

## What’s Working

1. **Green-led, red-for-danger**  
   Olive is used consistently for headers, active tabs, primary CTAs, and accents. Red is confined to delete, errors, and retry. Buttons like “Peruuta” use neutral/cancel styling. Color meaning is clear and matches Design Context.

2. **Empty states that teach**  
   HomeScreen empty shelf explains what the list is (“Täällä näet luettavien listasi…”), why it’s empty, and what to do next (Hae suosituksia, Siirry kirjoihin). PastReadScreen distinguishes “no books at all” vs “no books this month” with clear copy. AIChatListScreen empty state explains value and has a clear CTA. These feel designed, not placeholder.

3. **Warm, consistent surfaces**  
   Beige surface and surfaceVariant are used across main screens and modals. Spacing and typography tokens (display, section, emptyHero) create rhythm. Touch targets and reduced motion are addressed. The product feels coherent and considerate.

---

## Priority Issues

### 1. No distinctive typography — DONE

- Plus Jakarta Sans applied app-wide (display/section/empty-state use Bold; body and lists use Regular). See `.cursor/docs/typography-plus-jakarta.md` and Design Context in `.cursorrules`.

### 2. Two competing focal points on HomeScreen (Luettavat) — DONE

- **What:** When the shelf had books, the main list and the "Mitä lukea seuraavaksi?" section both demanded attention; when empty, the empty state and recommendation block appeared together.
- **Done:** Footer ("Mitä lukea seuraavaksi?") is shown only when the shelf has books. Wishes block is collapsed by default ("Lisää toiveet" / "Piilota toiveet"). One primary action when empty; optional wishes when shelf has books.

### 3. Modal-heavy flows — PARTIALLY DONE

- **What:** Book actions and filters use modals; user goes list → tap → modal → close → list.
- **Done (partial):** BookOptionsModal and FilterSortModal use `presentationStyle="pageSheet"` on iOS so the list stays visible behind the sheet. Confirmations and Player remain modal (acceptable). Remaining: same sheet pattern on Android if desired; long-press + sheet for book options optional.


### 4. “Kirjasto” vs “Kirjat” and discovery — DONE

- **What:** Bottom tab is “Kirjat” (Books); inside it the main title is “Audiobookshelf” and a “Hae Finnasta” toggle. New users may not understand that “Kirjat” = ABS library + Finna search, or where to add books first.
- **Why it matters:** Information architecture should make “where do I add books?” obvious. Right now it’s clear only after opening the tab and reading the header.
- **Fix:** Consider a short onboarding tip or tab label that hints at “Kirjat = oma kirjasto + haku” (or keep label and add one line of subcopy on first visit). Ensure empty states on Luettavat point to “Kirjat” as the place to add from library/Finna.
- **Done:** Permanent subcopy "Oma kirjasto ja Finna-haku" on Kirjat screen; empty-shelf and hint already point to Kirjat.

### 5. Success and loading feedback — DONE

- **What:** After “Hae suosituksia,” loading is clear (spinner, “Haetaan…”). After adding a book from search or recommendation, feedback is often just the list updating or a modal closing. No brief “Lisätty hyllylle” toast or inline confirmation.
- **Why it matters:** Users need to know the action succeeded, especially when the result is not obvious (e.g. adding from Finna and staying on the same screen).
- **Done:** Success toast ("Lisätty hyllylle" / "Merkitty luetuksi") via SuccessToastContext on add and mark-as-read from all entry points.

---

## Minor Observations

- **View toggle:** Visible "Lista" / "Ruudukko" added on HomeScreen and PastReadScreen. “Lista” / “Ruudukko” **Addressed.**
- **Recommendation reason:** Recommendation rows show AI reason in quotes; type is small and italic. Long reasons have Lue lisää / Näytä vähemmän in BookList. **Addressed.**
- **Filter chips (PastReadScreen, NewBooksScreen, ABSLibraryScreen):** Inactive chip uses `surfaceVariant`; active uses primary. Contrast is good; chip shape and padding are consistent.
- **Recommendation reason (duplicate line removed):** readable but could be one line + “Lue lisää” - **Filter chips (PastReadScreen, NewBooksScreen, ABSLibraryScreen):** Inactive chip uses `surfaceVariant`; active uses primary. Contrast is good; chip shape and padding are consistent.
- **Player modal:** Speed control (1.0x–2.0x) is discoverable once the control is visible; consider a first-time hint or default-open state for new users.
- **Copy consistency:** “Hylly” is used for “shelf” (Luettavien hylly, Luettujen hylly). “Kirjasto” in tab = library (ABS). Terminology is consistent in Finnish.

---

## Questions to Consider

- **What if the primary action on the home screen were always one button?** (e.g. “Hae suosituksia” when empty, “Näytä suositukset” when shelf has books, with wishes as optional expand.)
- **Does the app need this many entry points to “add a book”?** (Shelf empty CTA, Kirjat tab, NewBooksScreen, Finna search, recommendations — could one path be the “main” and others secondary?)
- **What would a confident, unmistakable BookShelf look like in one screen?** (e.g. Luettavien hylly with a single bold type treatment and one clear next step.)
- **Are all modals necessary?** (e.g. Filter/sort as a bottom sheet; book options as a long-press menu + sheet instead of full modal.)
- **Who is the one user we’re willing to disappoint?** (Clarifying this would help decide how much to simplify vs. how much to support power users.)

---

## Summary

The interface avoids generic AI slop: palette and semantics are coherent, empty states and accessibility have been improved, and the product feels calm and warm. **Done:** typography (Plus Jakarta Sans app-wide), HomeScreen hierarchy (footer only when shelf has books, wishes collapsed by default), modal usage (options and filter/sort as iOS pageSheet). Kirjat discovery and success feedback are done. “Kirjat” ; view toggle labels and recommendation Lue lisää are in place. No remaining priority issues; the promise is strengthened; “personal, relaxed, inspiring” 