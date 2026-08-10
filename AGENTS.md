# Bookshelf V2 — Agent Guidelines

Personal library app (read list + to-be-read list) for a single heavy reader. Maintained and developed primarily with AI agents.

## Tech Stack

React Native (Expo) · TypeScript · React Native Paper · React Navigation (native stack + bottom tabs) · Firebase (Auth + Firestore) · TanStack Query · MaterialCommunityIcons (`@expo/vector-icons`)

## Hard Rules

- **Strict TypeScript.** No `any` unless truly unavoidable. Define interfaces for props and API responses.
- **Rules of Hooks.** Never place hooks after a conditional return. All hooks at the top of the component.
- **Theme, not hex.** All colors and shared UI patterns come from `theme.ts` (`colors`, `headerStyle`, `headerTintColor`, `loaderColor`, `typography`). Never add hex literals in components or screens.
- **State management.** TanStack Query for server state, Context for global app state. Don't introduce other state libraries.
- **Reuse first.** Prefer existing shared components (BookList, BookGridItem, SearchBar, existing modals) and hooks over new one-off implementations. If logic repeats, extract to `components/` or `hooks/`.
- **Root-cause fixes only.** No temporary patches. After fixing a bug, grep for the same pattern elsewhere and fix it consistently.
- **Keep it simple.** Match existing patterns; don't over-engineer or add abstractions the task doesn't need.

## Codebase Map

See `.cursor/docs/codebase-overview.md` for screens, data flow, shared UI, and key paths. Keep that file up to date when structure changes; it is the single source of truth for structure.

## Design

Design system, brand, and UI principles live in `.cursor/rules/design.mdc` (auto-attached when editing UI files). Read it before any visual work.

## Workflows

Runnable commands live in `.cursor/commands/`: commit, push, uxdiscussion, featurediscussion, refactor-or-fix. Use them when asked to run those workflows; don't duplicate their steps elsewhere.
