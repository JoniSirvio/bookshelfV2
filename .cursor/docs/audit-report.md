# Bookshelf V2 — Interface Quality Audit Report

**Date:** March 14, 2025  
**Scope:** Main app (screens/, components/) — excludes admin-app unless noted.  
**Reference:** frontend-design skill (DO/DON'Ts), Design Context in `.cursorrules`, theme.ts.

---

## Anti-Patterns Verdict

**Verdict: Partially aligned; not full “AI slop” but clear design-system drift and generic choices.**

- **Design-system violations:** Design Context states “red only for delete” and “beige over white.” The UI uses red for non-destructive actions (e.g. ReviewModal cancel button `#F44336`), Material blue for secondary (`#2196F3`), and pure white/grays (`#fff`, `#eee`, `#f0f0f0`, `#999`, `#777`) throughout. That reads as generic, not “personal, relaxed, warm” or “green-led, red for danger.”
- **Gray-on-white / generic grays:** Multiple grays (`#777`, `#999`, `#ccc`, `#ddd`, `#eee`, `#f0f0f0`, `#FAFAFA`, `#E0E0E0`) are hard-coded. Frontend-design: “Don’t use gray text on colored backgrounds” and “always tint” — here gray is often on white, which can fail contrast and feels generic.
- **Pure black/white:** `shadowColor: '#000'`, `backgroundColor: 'white'`, `#fff` appear in many components. Design Context and frontend-design prefer tinted neutrals (e.g. beige, warm gray).
- **Rounded rectangles + generic shadows:** Modal cards use standard border radius + shadow; no distinctive character. Fits “safe, forgettable” pattern.
- **No distinctive typography:** System fonts only; no modular scale or fluid sizing. Design Context asks for “unique” persona; typography is not differentiated.
- **Modals:** Many flows use modals (Review, ConfirmDelete, BookOptions, FilterSort, Login, AskAI, Player). Frontend-design says “don’t use modals unless there’s no better alternative” — on mobile some of these are reasonable (confirmations, full-screen forms); worth reviewing whether every modal is necessary.
- **What’s not slop:** Olive green primary and delete red are used correctly in several places. theme.ts exists and is imported. Reanimated is used with transform (not layout). One empty state (AIChatListScreen) is well done. No gradient text, no cyan-on-dark, no bounce easing.

---

## Executive Summary

| Metric | Count |
|--------|--------|
| **Critical** | 2 |
| **High** | 7 |
| **Medium** | 10 |
| **Low** | 5 |

**Most critical issues**

1. **No accessibility labels/roles/hints** — Screen readers get no context on interactive elements or content (React Native: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`).
2. **Placeholder and secondary text contrast** — `#999` (and similar) on white fails WCAG AA for text; affects placeholders and secondary copy.
3. **Widespread hard-coded colors** — 20+ components use hex/rgba outside theme; blocks consistent theming and future dark/beige alignment.
4. **Red used for non-destructive actions** — ReviewModal uses red for “Peruuta” (cancel), contradicting “red only for delete.”
5. **Missing empty states** — HomeScreen (shelf) and BookList have no `ListEmptyComponent` when there are zero books.

**Overall quality:** Theming and accessibility are the biggest gaps. Visual direction is partially aligned with Design Context (green primary, some use of theme) but undermined by grays, pure white, and red/blue used outside the stated rules. Performance and layout are adequate; no critical performance anti-patterns found.

**Recommended next steps**

1. Add accessibility props to all interactive and meaningful static elements.
2. Replace hard-coded colors with theme tokens and add a warm neutral/beige background token.
3. Restrict red to destructive actions only; use theme (or new tokens) for cancel/secondary.
4. Add empty states for shelf and read list, and consider `/onboard` for first-time experience.
5. Plan dark theme and system theme support (tokens + reduced-motion for animations).

---

## Detailed Findings by Severity

### Critical Issues

| # | Location | Category | Description | Impact | WCAG/Standard | Recommendation | Suggested command |
|---|----------|----------|-------------|--------|----------------|-----------------|--------------------|
| C1 | All interactive components (TouchableOpacity, buttons, list items, tabs, modals) | Accessibility | No `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint` on buttons, list items, tabs, icons, or form controls. | Screen reader users cannot understand purpose of controls or content. Blocks WCAG 2.1 Level A (4.1.2 Name, Role, Value). | 4.1.2 (A) | Add `accessibilityLabel` (and where needed `accessibilityRole`/`accessibilityHint`) to every interactive element. Use `accessible={true}` and group related content where appropriate. | `/harden` |
| C2 | HomeScreen.tsx (placeholderTextColor), ReviewModal.tsx, AskAIAboutBookModal.tsx, BookGridItem.tsx, FilterSortModal.tsx (e.g. `#999`, `#777`, `#888`) | Accessibility / Theming | Placeholder and secondary text use light gray (`#999`, `#777`) on white. Contrast is below 4.5:1 for normal text. | Fails WCAG AA; low vision and aging users cannot read placeholders and secondary text. | 1.4.3 Contrast (AA) | Replace with theme token (e.g. `colors.textSecondary` or a new `placeholder` token) that meets 4.5:1 on background. Prefer tinted neutrals over pure gray. | `/normalize` + design token for placeholder |

### High-Severity Issues

| # | Location | Category | Description | Impact | WCAG/Standard | Recommendation | Suggested command |
|---|----------|----------|-------------|--------|----------------|-----------------|--------------------|
| H1 | ReviewModal.tsx (lines 338, 347), ConfirmDeleteModal.tsx (104) | Theming / Design system | ReviewModal: cancel button `#F44336` (red), secondary `#2196F3` (blue). ConfirmDeleteModal: cancel `#5bc0de`. Design Context: “Red only for destructive actions.” | Red for “Peruuta” suggests destructive action; confuses users and weakens trust in delete vs cancel. | Design Context | Use theme for cancel/secondary (e.g. neutral or `textSecondary` background). Reserve red for confirm delete only. Add `colors.cancel` or `colors.secondaryAction` to theme if needed. | `/normalize` |
| H2 | theme.ts; all screens/modals using `white` / `#fff` / `#FFFFFF` | Theming | No beige or warm background token. Design Context: “Prefer beige over pure white.” Many components use `backgroundColor: 'white'` or `colors.white`. | Interface feels cold and generic; does not match “warm, relaxed” direction. | Design Context | Introduce e.g. `colors.surface` or `colors.background` (beige/warm white) in theme.ts and use for screens/modals. Reserve pure white for specific emphasis if at all. | `/normalize` |
| H3 | 15+ files (see Patterns below) | Theming | Hard-coded hex/rgba in styles: `#eee`, `#f0f0f0`, `#ddd`, `#ccc`, `#FAFAFA`, `#E0E0E0`, `#999`, `#777`, `#2196F3`, `#F44336`, `#5bc0de`, `#33691E`, `#FFD700`, `#C0C0C0`, etc. | Inconsistent look, harder to introduce dark theme or beige; maintenance burden. | Design Context, theme.ts | Replace with theme tokens. Add tokens for border, surface variant, placeholder, secondary action, star active/inactive. | `/normalize` |
| H4 | BookList.tsx, HomeScreen.tsx (list/grid) | Responsive / Onboarding | No `ListEmptyComponent` when `books.length === 0`. User sees header/footer (“Luettavien hylly”, “Mitä lukea seuraavaksi?”) but no “Your shelf is empty” or CTA to add books. | New users see an empty list with no guidance; poor first impression and unclear next step. | UX best practice | Add `ListEmptyComponent` to DraggableFlatList and FlashList with short message + optional CTA (e.g. “Hae kirjoja” or “Search for books”). | `/onboard` or manual |
| H5 | BottomNavi.tsx (header buttons), AIChatsHeaderButton, NotificationBell | Responsive / Accessibility | Header/tab actions use 40×40 pt touch targets. iOS HIG and Android recommend minimum 44–48 pt. | Touch targets slightly below recommended size; harder for motor impairment and fat-finger errors. | WCAG 2.5.5 Target Size (AAA); platform HIG | Increase to at least 44×44 pt (e.g. padding or minWidth/minHeight). Keep hitSlop if needed for visual size. | `/adapt` or `/polish` |
| H6 | theme.ts, all components | Theming | No dark theme or theme switching. Design Context: “Add a dark theme later,” “theme should eventually follow system settings.” | No path to dark mode; future work will require sweeping changes if colors stay hard-coded. | Design Context | Introduce theme shape (e.g. light/dark) and use tokens everywhere so a later dark palette and system preference can be plugged in. | `/normalize` (tokens first), then theme provider |
| H7 | ScrollToHideHeader, any animated views | Accessibility | No `reduceMotion` / `prefers-reduced-motion` handling. Reanimated `withTiming` always runs. | Users who need reduced motion may be disoriented or unable to use the app comfortably. | WCAG 2.3.3 Animation from Interactions (AAA); a11y best practice | Check `AccessibilityInfo.isReduceMotionEnabled()` (or equivalent) and skip or shorten animations when reduced motion is preferred. | `/harden` or `/animate` |

### Medium-Severity Issues

| # | Location | Category | Description | Impact | Recommendation | Suggested command |
|---|----------|----------|-------------|--------|-----------------|--------------------|
| M1 | BookList.tsx (itemContainer isActive), borderBottomColor | Theming | Active list item uses `#f0f0f0`; list item border `#eee`. Not from theme. | Inconsistent with design tokens and future themes. | Use theme tokens (e.g. `colors.bgTint` or new `surfaceVariant`). | `/normalize` |
| M2 | BookList.tsx, BookGridItem.tsx, PlayerModal.tsx, AskAIAboutBookModal.tsx, BookOptionsModal.tsx, MiniPlayer.tsx, AIChatListScreen.tsx | Accessibility | Book cover and content images have no `accessibilityLabel`. When image is the main tappable content, screen reader announces nothing meaningful. | Decorative images are OK without label; tappable cover images should have a name (e.g. book title). | Add `accessibilityLabel={title}` (or equivalent) to tappable Image/cover containers. Mark purely decorative images `accessibilityElementsHidden` or give empty label per platform. | `/harden` |
| M3 | HomeScreen.tsx (lines 126, 135) | Theming | `placeholderTextColor="#999"`, `ActivityIndicator color="#33691E"`. | Inconsistent with theme; #33691E is dark green, close but not theme.primary. | Use `colors.textSecondary` or new placeholder token for placeholder; `loaderColor` for ActivityIndicator. | `/normalize` |
| M4 | ReviewModal.tsx (stars, switch, inputs) | Theming | Star colors `#FFD700` / `#C0C0C0`; switch track/thumb hex; inputs `#FAFAFA`, `#f0f0f0`, `#e0e0e0`; button colors as in H1. | Entire modal is off design system. | Move stars to theme (e.g. `colors.stars` + inactive star token); use theme for all backgrounds and buttons. | `/normalize` |
| M5 | AskAIAboutBookModal.tsx (multiple styles) | Theming | Many inline grays: `#eee`, `#f0f0f0`, `#FAFAFA`, `#E0E0E0`, `#999`, `placeholderTextColor="#999"`, error border rgba. | Same as H3 at component level. | Replace with theme tokens. | `/normalize` |
| M6 | FilterSortModal.tsx, BookOptionsModal.tsx | Theming | `#f5f5f5`, `#eee`, `#f0f0f0`, border colors. | Same as H3. | Use theme tokens for surfaces and borders. | `/normalize` |
| M7 | ConfirmDeleteModal.tsx (modalView) | Theming | `backgroundColor: 'white'`. | Contradicts “beige over white.” | Use theme background (e.g. future `colors.surface`). | `/normalize` |
| M8 | FormatBadge.tsx, BookGridItem.tsx (badges/overlays) | Theming | `backgroundColor: 'rgba(0, 0, 0, 0.6)'` and similar. Overlays are acceptable but could be theme tokens for consistency. | Minor; improves consistency and dark-theme readiness. | Add e.g. `overlayDark` to theme and use it. | `/normalize` |
| M9 | BottomNavi.tsx (notification badge) | Design | Notification dot uses `colors.secondary` (red). Design Context: “Red only for destructive actions; do not use red for generic accents or notifications.” | Red dot suggests danger rather than “new items.” | Use a non-red accent (e.g. primary green or a dedicated `badge` color) for non-destructive notifications. | `/normalize` or `/colorize` |
| M10 | Multiple modals | Theming | Modal overlays `rgba(0,0,0,0.5)` or `0.6`; shadowColor `#000`. | Pure black shadow and overlay; Design Context prefers tinted neutrals. | Consider theme overlay token; shadow can stay or use dark gray from theme. | `/normalize` (low priority) |

### Low-Severity Issues

| # | Location | Category | Description | Impact | Recommendation | Suggested command |
|---|----------|----------|-------------|--------|-----------------|--------------------|
| L1 | PastReadScreen, ABSLibraryScreen, NewBooksScreen | Onboarding | Empty states not audited in depth; may be minimal (e.g. “Ei kirjoja” only). | Opportunity to align with AIChatListScreen (icon + message + subtext + CTA). | Review and enhance empty states for consistency and guidance. | `/onboard` |
| L2 | Various list/grid components | Performance | Some list items not wrapped in `React.memo`; `renderItem` callbacks recreated. | Possible extra re-renders on scroll. | Memoize list item components and stable callbacks where profiling shows benefit. | `/optimize` |
| L3 | BookGridItem, BookList (cover images) | Performance | Remote images without explicit caching or loading strategy. | Could add blurhash or placeholder policy; not critical. | Consider image caching (e.g. expo-image) and placeholders. | `/optimize` |
| L4 | Typography across app | Design | Single font family (system), no type scale. Design Context asks for “unique” persona. | Visual identity could be strengthened with a deliberate scale and, if desired, one distinctive font. | Define a small type scale and optional display font in theme/docs. | `/bolder` or design pass |
| L5 | ScrollToHideHeader (withTiming 220ms) | Motion | Duration is reasonable; no bounce. | None significant. | Optional: align duration with a single motion token (e.g. 200–250ms) for consistency. | `/polish` |

---

## Patterns & Systemic Issues

1. **Hard-coded colors in 15+ components** — AskAIAboutBookModal, ReviewModal, LoginModal, BookGridItem, BookOptionsModal, ConfirmDeleteModal, ScrollToHideHeader, FormatBadge, FilterSortModal, BottomNavi, BookList, AIChatListScreen, HomeScreen, and others use hex/rgba outside theme. Fix by centralizing in theme and using tokens everywhere.
2. **No accessibility props on interactive elements** — Buttons, list items, tabs, icons, and form controls lack `accessibilityLabel`/`accessibilityRole`/`accessibilityHint`. Fix with a pass on every TouchableOpacity, Pressable, and key static content.
3. **Red and blue used outside design rules** — Red for cancel (ReviewModal) and blue for secondary/buttons appear in several places. Design Context: red only for delete. Fix by introducing cancel/secondary tokens and replacing ad-hoc colors.
4. **Pure white and gray everywhere** — `white`, `#fff`, and many grays prevent warm, beige, and dark-theme-ready UI. Fix by adding surface/background/placeholder tokens and migrating.
5. **Touch targets at or below 44pt** — Header and tab actions (40×40) are slightly small. Fix by increasing to ≥44pt or using hitSlop with clear documentation.
6. **Missing empty states for main lists** — HomeScreen shelf and read list do not show a dedicated empty state component. Fix by adding `ListEmptyComponent` and aligning with existing good pattern (AIChatListScreen).

---

## Positive Findings

- **theme.ts** is the single source for primary, delete, and several UI colors; many files import and use it.
- **ConfirmDeleteModal** uses `colors.delete` for the destructive action correctly.
- **AIChatListScreen** empty state is strong: icon, title, subtext, and FAB CTA; good model for other screens.
- **ScrollToHideHeader** uses Reanimated with `translateY` (transform), not layout properties; duration 220ms, no bounce.
- **Design Context** in `.cursorrules` clearly states green-led, red for danger, warm/beige, and theme-ready; gives a clear target for fixes.
- **FlashList** is used for grid; **DraggableFlatList** for reorderable list; appropriate choices for performance and UX.
- **No bounce/elastic easing** found in app code; motion is restrained.

---

## Recommendations by Priority

### Immediate (critical blockers)

1. Add accessibility labels/roles/hints to all interactive and key static elements (C1).
2. Fix placeholder and secondary text contrast; use theme or new token with ≥4.5:1 contrast (C2).

### Short-term (this sprint)

3. Restrict red to destructive actions; fix ReviewModal/ConfirmDeleteModal button colors (H1).
4. Introduce beige/warm background token and replace pure white where appropriate (H2).
5. Add `ListEmptyComponent` for shelf and read list (H4).
6. Replace the most visible hard-coded colors (modals, list items, inputs) with theme tokens (H3 subset).

### Medium-term (next sprint)

7. Add theme structure for dark/light and system preference (H6).
8. Increase header/tab touch targets to ≥44pt (H5).
9. Respect reduced motion for animations (H7).
10. Add accessibility labels to tappable book covers (M2).
11. Replace remaining hard-coded colors across all components (H3 full).

### Long-term (nice-to-have)

12. Stronger empty states and onboarding (L1, `/onboard`).
13. Optional performance pass: memoization, image handling (L2, L3).
14. Typography scale and optional display font (L4).
15. Motion token and overlay/shadow tokens (L5, M10).

---

## Suggested Commands for Fixes

| Goal | Command | Issues addressed |
|------|---------|------------------|
| Align with design system (colors, tokens, red/white/beige) | `/normalize` | C2, H1, H2, H3, M1, M3, M4, M5, M6, M7, M8, M9, M10 |
| Accessibility (labels, contrast, reduced motion) | `/harden` | C1, C2, H7, M2 |
| Touch targets and responsive behavior | `/adapt` | H5 |
| Empty states and first-run experience | `/onboard` | H4, L1 |
| Motion consistency and reduced motion | `/animate` | H7, L5 |
| Visual impact and typography | `/bolder` | L4 |
| Final pass (spacing, consistency) | `/polish` | H5, L5 |
| Performance (lists, images) | `/optimize` | L2, L3 |

Use this report as the source of truth for ordering and scoping fixes; run `/normalize` and `/harden` first for maximum impact.
