# Walkthrough - Book Reordering Implementation

I have implemented the ability to reorder books in the "Luettavat" (To Read) list. This involved refactoring the `BookList` component to use `react-native-draggable-flatlist` for drag-and-drop functionality and `react-native-swipeable-item` for improved swipe actions.

## Changes

### 1. Dependencies
- Installed `react-native-draggable-flatlist` and `react-native-reanimated`.
- Configured `babel.config.js` to include `react-native-reanimated/plugin`.

### 2. State Management (`hooks/useBooks.ts`)
- Updated `REORDER_BOOKS` action to accept a full list of books (`newList`) instead of indices.
- This aligns with `DraggableFlatList`'s `onDragEnd` callback which provides the reordered data.

### 3. Component Refactoring (`components/BookList.tsx`)
- Replaced `FlatList` with `DraggableFlatList`.
- Replaced `Swipeable` (from `react-native-gesture-handler`) with `SwipeableItem` (from `react-native-swipeable-item`).
- Added a drag handle icon (visible only in "home" mode).
- Enabled drag-and-drop on long press (only in "home" mode).
- Implemented `onReorder` prop to propagate changes to the global state.

### 4. Screen Integration (`screens/HomeScreen.tsx`)
- Passed the `reorderBooks` function from `useBooksContext` to the `BookList` component via the `onReorder` prop.

## Verification

### Automated Tests
I have not added automated tests for the UI interactions, but the logic changes in `useBooks` are straightforward state updates.

### Manual Verification Steps

1.  **Rebuild the App**:
    -   Since native dependencies (`react-native-reanimated`) were added/configured, you **must** rebuild the development build or restart the Metro bundler with clear cache:
        ```bash
        npx expo start -c
        ```

2.  **Verify Reordering ("Luettavat" List)**:
    -   Go to the "Luettavat" (Home) screen.
    -   Add multiple books if the list is empty.
    -   **Long press** on a book item OR press and hold the **drag handle icon** (hamburger menu icon) on the right.
    -   Drag the book to a new position and release.
    -   Verify that the book stays in the new position.
    -   Restart the app and verify that the new order is persisted (since `useBooks` persists to AsyncStorage).

3.  **Verify Swipe Actions**:
    -   **Swipe Right** on a book in "Luettavat": Should show "Luettu" action.
    -   **Swipe Left** on a book in "Luettavat": Should show "Poista" action.
    -   Verify that tapping these actions still works as expected (opens modal or deletes book).

4.  **Verify Other Screens**:
    -   Go to "Haku" (Search) screen. Verify that books are listed correctly and swipe actions work (Add/Added). Verify that you **cannot** drag/reorder books here.
    -   Go to "Luetut" (Read) screen. Verify that books are listed correctly and swipe actions work (Delete). Verify that you **cannot** drag/reorder books here.

## Troubleshooting

-   **Error: `[reanimated] logicLoader` or similar**: Ensure you cleared the metro cache (`npx expo start -c`).
-   **Crash on startup**: Ensure `babel.config.js` changes were applied and the app was rebuilt if running on a physical device/emulator that requires native code updates (though Expo Go usually handles Reanimated fine if the version matches).
