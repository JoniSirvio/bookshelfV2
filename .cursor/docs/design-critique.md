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
- **Typography:** System fonts only; no Inter/Roboto overload but also no distinctive display/body pairing. Design Context asks for “unique” persona — type is clear and hierarchical (display/section/emptyHero) but not memorable. **Partial:** hierarchy exists, personality does not.
- **Pure white:** Theme uses tinted surface (`#F5F4F0`) and surfaceVariant; screens and modals use `colors.surface`. Pure white still appears in a few spots (e.g. some list backgrounds). **Mostly addressed.**
- **Modals:** ConfirmDelete, Review, BookOptions, FilterSort, Login, AskAI, Player — many flows are modal-heavy. Frontend-design: “Don’t use modals unless there’s no better alternative.” On mobile, confirmations and full-screen player are reasonable; the volume of modals still makes the product feel “modal-first” rather than “flow-first.” **Minor tell.**
- **Rounded rectangles + shadow:** Cards and CTAs use consistent radius (12–16) and olive-tinted shadow on primary button. Not the “generic gray drop shadow on every card” pattern; shadow is purposeful. **Acceptable.**
- **Gray on color:** Recommendation and shelf badges use primary-tinted text (`colors.primary`) on light green (`bgRec`); no gray-on-colored-background washout. **Good.**

**The test:** If you said “AI made this,” someone might guess it was tool-assisted (consistent tokens, clear structure) but would not immediately think “generic 2024 AI UI.” The olive+beige, Finnish copy, and restrained motion read as intentional. The main gap is typography and one clear “signature” moment — something that makes the app unmistakably BookShelf.

---

## Overall Impression

**What works:** The app feels calm, warm, and task-focused. The palette is coherent; empty states explain and guide; primary actions (e.g. “Hae suosituksia,” “Siirry kirjoihin”) are easy to find. Hierarchy (display vs section vs body) is clear. Accessibility and reduced motion have been considered.

**What doesn’t:** Typography is safe, not distinctive. There is no single “hero” moment that defines the experience. Some screens still compete for attention (e.g. Luettavat has both empty shelf and recommendations section). Modals dominate the interaction model. A few labels and flows could be clearer.

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

### 1. No distinctive typography

- **What:** All type uses system fonts with a clear but generic scale (26 / 23 / 25 px, weight 700). Design Context and frontend-design ask for a recognizable, non-generic persona.
- **Why it matters:** Typography is the fastest way to signal “this is BookShelf.” Right now it could be any well-structured reading app.
- **Fix:** Introduce one distinctive font — e.g. a display face for “Luettavien hylly” and empty-state titles, or a single refined serif/sans that’s not system default. Keep the existing scale; change the face.
- **Command:** Design/typography decision first; then implement (could be documented in Design Context; no single skill covers “add a font”).

### 2. Two competing focal points on HomeScreen (Luettavat)

- **What:** When the shelf has books, the main list and the “Mitä lukea seuraavaksi?” section (with input + “Hae suosituksia”) both demand attention. When the shelf is empty, the empty state and the same recommendation block appear together; the primary CTA is clear, but the section below still competes.
- **Why it matters:** Users may be unsure whether to scroll, tap the CTA, or use the footer. Hierarchy is good within each block but not across the full screen.
- **Fix:** When shelf is empty, consider hiding or collapsing the footer recommendation block so the only primary action is the empty-state CTA. When shelf has books, make the section title + one primary button the clear “next step” and reduce visual weight of the optional wishes input (e.g. collapsed by default).
- **Command:** `/distill` or `/clarify` — simplify hierarchy and copy so one primary action dominates per context.

### 3. Modal-heavy flows

- **What:** Book actions (options, review, delete, AI) and filters all use modals. User often goes: list → tap item → modal → close → back to list. No inline expansion or bottom sheet pattern for “quick” actions.
- **Why it matters:** Frontend-design cautions against modals as default. Heavy modal use can feel interruptive and make the list feel like a launcher rather than the main workspace.
- **Fix:** Keep modals for confirmations (delete, destructive) and full-screen experiences (Player, possibly Review). For “what do you want to do with this book?” consider a bottom sheet or inline actions so context (the list) stays visible. Filter/sort could be a slide-over or sheet instead of a centered modal.
- **Command:** `/distill` or design spike; then implement (no single skill).

### 4. “Kirjasto” vs “Kirjat” and discovery

- **What:** Bottom tab is “Kirjat” (Books); inside it the main title is “Audiobookshelf” and a “Hae Finnasta” toggle. New users may not understand that “Kirjat” = ABS library + Finna search, or where to add books first.
- **Why it matters:** Information architecture should make “where do I add books?” obvious. Right now it’s clear only after opening the tab and reading the header.
- **Fix:** Consider a short onboarding tip or tab label that hints at “Kirjat = oma kirjasto + haku” (or keep label and add one line of subcopy on first visit). Ensure empty states on Luettavat point to “Kirjat” as the place to add from library/Finna.
- **Command:** `/onboard` or `/clarify` — copy and possibly one-time hint.

### 5. Success and loading feedback

- **What:** After “Hae suosituksia,” loading is clear (spinner, “Haetaan…”). After adding a book from search or recommendation, feedback is often just the list updating or a modal closing. No brief “Lisätty hyllylle” toast or inline confirmation.
- **Why it matters:** Users need to know the action succeeded, especially when the result is not obvious (e.g. adding from Finna and staying on the same screen).
- **Fix:** Add a short, non-blocking success state: toast, inline banner, or checkmark animation when a book is added to the shelf or marked as read. Keep it calm and dismissible.
- **Command:** `/delight` or `/harden` — confirm success states and reduce doubt.

---

## Minor Observations

- **Luettujen hylly view toggle:** The list/grid switch has no label next to it; tooltip/accessibility label helps. Already has a11y label; consider a visible “Lista” / “Ruudukko” for clarity.
- **Recommendation reason copy:** Recommendation rows show AI reason in quotes; type is small and italic. Readable but could be one line + “Lue lisää” if long, to keep list scan-friendly.
- **Filter chips (PastReadScreen, NewBooksScreen, ABSLibraryScreen):** Inactive chip uses `surfaceVariant`; active uses primary. Contrast is good; chip shape and padding are consistent.
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

The interface avoids generic AI slop: palette and semantics are coherent, empty states and accessibility have been improved, and the product feels calm and warm. The main gaps are **typography** (no distinctive voice), **hierarchy on HomeScreen** (two competing blocks), **modal usage** (heavy), **discovery of “Kirjat”** (add books), and **success feedback** (add/read confirmations). Addressing these in that order would strengthen the “personal, relaxed, inspiring” promise and make BookShelf feel more intentional and memorable.
