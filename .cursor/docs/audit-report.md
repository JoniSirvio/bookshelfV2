# Bookshelf V2 — Interface Quality Audit Report

**Date:** March 14, 2026  
**Scope:** Main app (screens/, components/) — excludes admin-app unless noted.  
**Reference:** frontend-design skill (DO/DON'Ts), Design Context in `.cursorrules`, theme.ts.

---

## Anti-Patterns Verdict

**Verdict: Largely aligned; not “AI slop.” A few remaining tells and gaps.**

- **Design system progress:** Theme has warm surfaces (`surface`, `surfaceVariant`), `cancel`, `badge`, `placeholder`; modals use `colors.surface` and `colors.cancel`. Red is reserved for delete; notification badge uses `colors.badge` (olive). **Good.**
- **No AI color palette:** No cyan-on-dark, purple-to-blue gradients, neon accents, or gradient text. Olive leads; typography uses Plus Jakarta Sans. **Good.**
- **No glassmorphism or hero-metric template.** **Good.**
- **One remaining “accent bar” pattern:** AskAIAboutBookModal blockquote uses `borderLeftColor: colors.primary`, `borderLeftWidth: 4` and a hard-coded `rgba(99, 107, 47, 0.08)` background — the same “colored left stripe” pattern the frontend-design skill flags. **Fix with `/normalize`** (neutral border or theme token).
- **Modals:** Many flows use modals (Review, ConfirmDelete, BookOptions, FilterSort, Login, AskAI, Player). Frontend-design: “Don’t use modals unless there’s no better alternative.” On mobile some are reasonable; the volume still feels “modal-first.” **Minor tell.**
- **Rounded cards + shadow:** Used consistently with olive-tinted shadow on primary CTAs; not generic gray-everywhere. **Acceptable.**

**The test:** If you said “AI made this,” someone might notice the blockquote styling or modal count but would not immediately think “generic 2024 AI UI.” The olive+beige palette, Finnish copy, Plus Jakarta Sans, and reduced-motion support read as intentional.

---

## Executive Summary

| Metric | Count |
|--------|--------|
| **Critical** | 0 |
| **High** | 3 |
| **Medium** | 6 |
| **Low** | 4 |

**Most critical issues**

1. **FlashList type error (ABSLibraryScreen)** — `estimatedItemSize` triggers a TypeScript error at L461; may indicate version mismatch or typing gap. Code runs but blocks strict type checking.
2. **Filter/sort options without accessibility labels** — FilterSortModal `SortItem` and `StatusItem` TouchableOpacity components have no `accessibilityLabel`; screen reader users get no context for sort/filter choices.
3. **AskAIAboutBookModal blockquote** — Hard-coded rgba and primary left border; deviates from design system and repeats a pattern previously removed elsewhere (e.g. Kirjat hint).

**Overall quality:** Theming and accessibility have improved since the last audit (theme tokens, placeholder contrast, empty states, reduced motion, many a11y labels). Remaining work: finish a11y on sort/filter and a few modal controls, remove the last “accent bar” usage, fix FlashList typing, and optionally add dark theme and a motion token.

**Recommended next steps**

1. Fix FlashList `estimatedItemSize` type in ABSLibraryScreen (or align FlashList types project-wide).
2. Add `accessibilityLabel` (and where needed `accessibilityRole`) to FilterSortModal sort/filter options and any remaining unlabeled interactive elements.
3. Normalize AskAIAboutBookModal blockquote to theme tokens and remove the primary left border (or replace with neutral border).
4. Consider dark theme and system preference (theme shape + tokens).
5. Optional: motion duration token; ensure any remaining animated views respect reduced motion.

---

## Detailed Findings by Severity

### Critical Issues

*None.* Previous criticals (missing a11y everywhere, placeholder contrast) have been addressed: theme placeholder, empty states, reduced motion, and many interactive elements now have labels.

### High-Severity Issues

| # | Location | Category | Description | Impact | Recommendation | Suggested command |
|---|----------|----------|-------------|--------|-----------------|--------------------|
| H1 | ABSLibraryScreen.tsx L461 | Performance / Code quality | `FlashList` is used with `estimatedItemSize={200}` but the prop is not recognized by the current `FlashListProps` type, causing a TypeScript error. | Type safety and CI/lint may fail; future refactors could miss list config. | Align FlashList version and types, or extend/cast props so `estimatedItemSize` is accepted. Verify other FlashList usages (HomeScreen, PastReadScreen, NewBooksScreen) for same issue. | Manual fix or `/harden` |
| H2 | FilterSortModal.tsx (SortItem, StatusItem) | Accessibility | `SortItem` and `StatusItem` render `TouchableOpacity` with no `accessibilityLabel` or `accessibilityRole`. Options like “Järjestä: Nimi”, “Suodata: Luettu” are not announced. | Screen reader users cannot identify sort/filter options (WCAG 4.1.2 Name, Role, Value). | Add `accessibilityLabel` (e.g. `${label}, ${isSelected ? 'valittu' : 'valitse'}`) and `accessibilityRole="button"` to both item types. | `/harden` |
| H3 | AskAIAboutBookModal.tsx (blockquote style) | Theming / Anti-pattern | Blockquote uses `backgroundColor: 'rgba(99, 107, 47, 0.08)'` and `borderLeftColor: colors.primary`, `borderLeftWidth: 4`. Hard-coded tint and “colored left stripe” match a pattern the frontend-design skill discourages. | Inconsistent with normalized hint/callout pattern elsewhere; perpetuates “accent bar” look. | Use theme tokens (e.g. `colors.surfaceVariant`) for background and `colors.border` for left border, or a single neutral border; remove primary accent. | `/normalize` |

### Medium-Severity Issues

| # | Location | Category | Description | Impact | Recommendation | Suggested command |
|---|----------|----------|-------------|--------|-----------------|--------------------|
| M1 | ReviewModal.tsx (year stepper, custom date toggle) | Accessibility | Year +/- buttons (L153, L157) and the “Valitse ajankohta käsin” area (L169) may lack descriptive `accessibilityLabel`/`accessibilityHint`. Modal and main actions have labels. | Screen reader users may not understand stepper or date toggle context. | Add labels such as “Vähennä vuosi”, “Lisää vuosi”, and ensure the custom-date switch/toggle has a clear name and state. | `/harden` |
| M2 | theme.ts; app-wide | Theming | No dark theme or theme switching. Design Context notes “add a dark theme later” and “theme should eventually follow system settings.” | No path to dark mode without broad changes if colors remain token-based but single-palette. | Introduce a theme shape (e.g. light/dark) and use tokens everywhere so a dark palette and system preference can be added later. | `/normalize` (tokens first) |
| M3 | ScrollToHideHeader, AnimatedFadeInView, AnimatedScalePressable | Motion | Reduced motion is respected via `useReduceMotion()` in these components. Other animated views (e.g. Modal `animationType`, any other Reanimated usage) were not audited for reduce-motion. | Some animations may still run for users who prefer reduced motion. | Audit all Modal and Reanimated usage; where appropriate, shorten or skip animations when `useReduceMotion()` is true. | `/animate` or `/harden` |
| M4 | headerTintColor in theme.ts | Theming | Exported as literal `'#fff'` instead of `colors.white`. Cosmetic and currently equivalent. | Slight inconsistency; if `colors.white` is ever themed, header would not follow. | Use `colors.white` (or a dedicated `headerTintColor` token) in theme for consistency. | `/polish` |
| M5 | Modal overlays and shadows | Theming | Overlay uses `colors.overlay` / `colors.overlayDark`; shadow uses `colors.shadow`. Design Context prefers tinted neutrals over pure black; current values are dark gray/black. | Minor; acceptable for contrast. Could be refined for a warmer dark theme. | Optional: introduce tinted overlay/shadow tokens when adding dark theme. | `/normalize` (low priority) |
| M6 | Various list/grid screens | Performance | FlashList and list item components not fully audited for memoization of `renderItem` or item components. | Possible extra re-renders on scroll. | Profile and memoize where beneficial; ensure `estimatedItemSize` is set where required. | `/optimize` |

### Low-Severity Issues

| # | Location | Category | Description | Impact | Recommendation | Suggested command |
|---|----------|----------|-------------|--------|-----------------|--------------------|
| L1 | Empty states (PastReadScreen, NewBooksScreen, ABSLibraryScreen) | Onboarding | Empty states exist; depth and consistency with HomeScreen/AIChatListScreen not fully audited. | Opportunity to align copy and CTAs across screens. | Review empty-state copy and primary action per screen; align with design-critique and onboard skill. | `/onboard` |
| L2 | Book cover images in list/grid | Accessibility | Tappable area has `accessibilityLabel` on the wrapper (BookList, BookGridItem). Image itself may have no `accessible`/label; confirm behavior on iOS/Android. | Usually sufficient when the pressable has a label; verify no duplicate or missing announcements. | Confirm cover images are either decorative (hidden) or have a single clear label on the control. | `/harden` (verify only) |
| L3 | Motion duration | Motion | ScrollToHideHeader and other animations use fixed durations (e.g. 220ms). No shared motion token. | Inconsistent timing if more animations are added. | Optional: add a motion token (e.g. `durations.standard`) and use it in Reanimated configs. | `/polish` |
| L4 | admin-app | Theming | admin-app uses inline rgba/boxShadow; out of scope for main app but part of repo. | Inconsistent with main app theme. | Optional: align admin-app with a shared token set or document as separate context. | Optional |

---

## Patterns & Systemic Issues

1. **Accessibility coverage is partial** — Many interactive elements have `accessibilityLabel` and `accessibilityRole` (BottomNavi, BookList, BookGridItem, FilterSortModal close/apply, PlayerModal, BookOptionsModal, ReviewModal main actions). FilterSortModal sort/filter options and a few ReviewModal controls (year stepper, custom date) still lack labels. One systematic pass would close the gap.
2. **Single “accent bar” left** — AskAIAboutBookModal blockquote is the only remaining “thick primary left border + tinted background” pattern. Normalizing it would align with the Kirjat hint and frontend-design guidance.
3. **FlashList typing** — One screen (ABSLibraryScreen) shows a type error for `estimatedItemSize`; other screens use the same prop. Suggests a global type fix or version alignment.
4. **Theme is single-palette** — No dark theme or system preference yet; theme.ts is the single source of truth and is used consistently in the main app.

---

## Positive Findings

- **theme.ts** is the single source for primary, delete, surface, surfaceVariant, cancel, badge, placeholder, and typography (Plus Jakarta Sans). Widely imported and used.
- **Placeholder and secondary text** use theme tokens (`colors.placeholder`, `colors.textSecondaryAlt`); contrast is addressed.
- **Empty states** — HomeScreen, PastReadScreen use `ListEmptyComponent` with clear copy and CTAs; AIChatListScreen is a strong example.
- **Reduced motion** — `useReduceMotion()` is used in ScrollToHideHeader, AnimatedFadeInView, AnimatedScalePressable; animations respect the preference.
- **Touch targets** — BottomNavi header buttons use `touchTargetMin` (44pt); design system documents target size.
- **ConfirmDeleteModal** uses `colors.delete` for destructive action and `colors.cancel` for cancel; ReviewModal uses `colors.cancel` for “Peruuta.”
- **Notification badge** uses `colors.badge` (olive), not red.
- **No bounce/elastic easing** in app code; motion is restrained.
- **No gradient text, glassmorphism, or AI color palette.**

---

## Recommendations by Priority

### Immediate (blockers / high impact)

1. Fix FlashList `estimatedItemSize` type in ABSLibraryScreen (H1).
2. Add accessibility labels to FilterSortModal sort/filter options (H2).
3. Normalize AskAIAboutBookModal blockquote styling (H3).

### Short-term (this sprint)

4. Add accessibility labels to ReviewModal year stepper and custom-date control (M1).
5. Optional: use `colors.white` or a token for `headerTintColor` (M4).

### Medium-term (next sprint)

6. Introduce theme shape for light/dark and system preference (M2).
7. Audit remaining Modal and Reanimated usage for reduced motion (M3).
8. Optional: motion duration token; overlay/shadow refinement for dark theme (L3, M5).

### Long-term (nice-to-have)

9. Align empty states and onboarding across screens (L1).
10. Performance pass: memoization, image handling (M6).
11. admin-app theming or scope documentation (L4).

---

## Suggested Commands for Fixes

| Goal | Command | Issues addressed |
|------|---------|------------------|
| Align blockquote and any remaining one-offs with design system | `/normalize` | H3, M4, M5 |
| Accessibility (labels on sort/filter, modal controls, verify covers) | `/harden` | H2, M1, L2 |
| FlashList type fix | Manual / TypeScript | H1 |
| Motion consistency and reduced motion audit | `/animate` | M3, L3 |
| Theme structure and dark mode prep | `/normalize` | M2 |
| Empty states and first-run experience | `/onboard` | L1 |
| Performance (lists, memoization) | `/optimize` | M6 |
| Final pass (tokens, spacing) | `/polish` | M4, L3 |

Use this report as the source of truth for ordering and scoping fixes. Prioritize H1–H3 and the accessibility pass (H2, M1) for maximum impact.
