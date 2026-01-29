# Codebase Overview

Quick reference for agents: where things live and how data flows in Bookshelf V2.

## Screens

- **screens/** — HomeScreen, PastReadScreen, ABSLibraryScreen, NewBooksScreen, ProfileScreen.
- Main UI: BottomNavi (tabs: Luettavat = Home, Kirjat = ABS Library, Luetut = Past Read) plus stack screen NewBooksScreen.

## Data & Context

- **Auth**: `useAuth()` from AuthContext (Firebase Auth).
- **Books (shelf/read/recommendations)**: `useBooksContext()` from BooksContext; data in Firestore via `hooks/useBooks.ts`.
- **ABS (audiobook library/items)**: `useABSCredentials()` + `api/abs.ts`.
- **Playback**: AudioContext (expo-audio, ABS streams).

## Shared UI

- **Lists/Grid**: BookList, BookGridItem.
- **Search**: SearchBar.
- **Modals**: ReviewModal, ConfirmDeleteModal, BookOptionsModal, FilterSortModal, LoginModal, PlayerModal.

Reuse these for new list/grid screens where possible.

## Navigation

- Bottom tabs in `components/BottomNavi.tsx`; stack screen NewBooks in `App.tsx`.
- Header style and app title: see Common Patterns in `.cursorrules`.

## Theme & Styling

- **theme.ts** (project root): Single source for colors and common UI patterns.
- Import `colors`, `headerStyle`, `headerTintColor`, `loaderColor` from `./theme` or `../theme`.
- Use `colors.primary`, `colors.delete`, `colors.bgRec`, etc. instead of hardcoded hex. Do not add new hex literals in components or screens.

## Commands

Runnable commands are in **.cursor/commands/**: commit, push, uxdiscussion, featurediscussion, refactor-or-fix. Use these when the user asks to commit, push, discuss UX/features, or refactor/fix; do not duplicate their steps elsewhere.

## Key Paths

- **theme.ts**: Colors, headerStyle, headerTintColor, loaderColor.
- **.cursor/commands/**: commit.md, push.md, uxdiscussion.md, featurediscussion.md, refactor-or-fix.md.
- **api/**: finna.ts, abs.ts, gemini.ts.
- **firebase/**: Config.ts, books.ts.
- **context/**: AuthContext, BooksContext, AudioContext.
- **hooks/**: useBooks, useABSCredentials, useViewMode, useProfile, useABSInProgress.
