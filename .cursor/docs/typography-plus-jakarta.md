# Typography: Plus Jakarta Sans (full app)

**Status:** Implemented.  
**Design critique:** Addresses Issue #1 — No distinctive typography.

## Decision

- **Font family:** Plus Jakarta Sans (Google Fonts, loaded via `@expo-google-fonts/plus-jakarta-sans`).
- **Weights used:** `PlusJakartaSans_400Regular` (body), `PlusJakartaSans_700Bold` (display/headlines/CTAs).
- **Scope:** Applied across **every screen and component** — lists, modals, headers, empty states, inputs, buttons, and markdown content. No system default for text; only icons and third-party components (e.g. React Native Paper) may still use system font where not overridden.

## Theme tokens (`theme.ts`)

- `typography.fontFamilyDisplay` → `'PlusJakartaSans_700Bold'` — screen titles, section headings, empty-state titles, primary buttons, labels that are bold.
- `typography.fontFamilyBody` → `'PlusJakartaSans_400Regular'` — body text, list items, metadata, inputs, secondary copy.

Existing numeric scale (e.g. displaySize 26, sectionSize 23, emptyHeroSize 25) is unchanged; only the typeface was added.

## Where it’s used

- **App:** Fonts loaded in `App.tsx`; stack screen `headerTitleStyle` uses `fontFamilyDisplay`.
- **Navigation:** Bottom tab labels and app title (“Book” / “Shelf”) in `BottomNavi` and `ScrollToHideHeader` use theme typography.
- **Screens:** HomeScreen, PastReadScreen, NewBooksScreen, ABSLibraryScreen, AIChatListScreen, ProfileScreen — all text styles use `fontFamilyDisplay` or `fontFamilyBody` as appropriate.
- **Lists & items:** BookList, BookGridItem — titles, authors, metadata, badges, progress text use theme fonts.
- **Modals:** FilterSortModal, BookOptionsModal, ConfirmDeleteModal, ReviewModal, LoginModal, AskAIAboutBookModal, PlayerModal — titles, options, buttons, inputs, and (where applicable) markdown use Plus Jakarta Sans.
- **Other components:** MiniPlayer, SearchBar, BookCoverPlaceholder (replaced Georgia/serif), AppBar. FormatBadge is icon-only.

## Plan alignment

This matches the user’s request: “Implement Plus Jakarta Sans in every screen and component, including lists.” The plan was updated to reflect full-app coverage rather than display/section/empty-state only.
