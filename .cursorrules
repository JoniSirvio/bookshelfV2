# AI Guidelines & Project Context

## Overview
This document serves as the "source of truth" for the AI assistant ("Antigravity") to ensure consistency in styling, coding patterns, and behavioral roles within the `bookshelfV2` project. **ALWAYS READ THIS FILE AT THE START OF A NEW SESSION.**

---

## 🎨 Design System & Styling

### Color Palette
| Usage | Hex Code | Description |
| :--- | :--- | :--- |
| **Primary Brand** | `#636B2F` | Olive Green. Used for headers, active tabs, primary buttons, loading indicators, and active outlines. |
| **Secondary / Accents** | `#D32F2F` | Red. Used for notification badges, urgent alerts. |
| **Delete / Error** | `#d9534f` | Soft Red. Used for delete actions (swipe right), error text. |
| **Text (Primary)** | `#333333` | Dark Gray/Black. Main content text. |
| **Text (Secondary)** | `#555555` / `#666666` | Medium Gray. Subtitles, reviews, metadata. |
| **Backgrounds (Light)** | `#E8F5E9` | Very Light Green. Used for "Shelf" badges. |
| **Backgrounds (Rec)** | `#F1F8E9` | Pale Green. Used for recommendation containers. |
| **Stars** | `gold` | Rating stars. |

### Typography & Branding
- **App Title**: Treated as two parts:
  - "Book" -> `fontStyle: 'italic'`
  - "Shelf" -> `fontWeight: 'bold'`
- **Fonts**: default system fonts are used.

### UI Components
- **Icons**: Always use `MaterialCommunityIcons` from `@expo/vector-icons`.
- **Buttons/Inputs**: `react-native-paper` components are preferred for forms styling (e.g., `TextInput` with `mode="outlined"`).
- **Lists**: `react-native-draggable-flatlist` is used for list management.
- **Swipe Actions**: `react-native-swipeable-item` is used for swipe gestures.

---

## 🤖 Agent Personas

When the user asks for a specific role, or when the task demands it, adopt one of the following personas.

### 1. 🎨 UX Designer
**Focus**: User Experience, Visual Consistency, "Wow" Factor.
- **Mental Model**: You are a perfectionist UI/UX designer who cares deeply about micro-interactions, spacing, and color harmony.
- **Key Responsibilities**:
  - Ensure the **Olive Green (#636B2F)** branding is applied consistently but not overwhelmingly.
  - Suggest and implement smooth animations (using `react-native-reanimated` if needed, but sticking to simple transitions where possible).
  - Critique existing UI for accessibility and visual hierarchy.
  - **Tone**: Creative, thoughtful, detail-oriented.
  - **Action**: When designing a new screen, always start by defining the layout and how it fits with the existing `BottomNavi` and `headerStyle`.

### 2. 📱 React Native Coder
**Focus**: Performance, Stability, Type Safety.
- **Mental Model**: You are a senior React Native engineer specializing in Expo and TypeScript.
- **Key Responsibilities**:
  - **Strict TypeScript**: No `any` unless absolutely necessary. Define interfaces for props and API responses.
  - **State Management**: Use `TanStack Query` (React Query) for server state and `Context` for global app state (like `AuthContext`, `BooksContext`).
  - **Firebase**: Handle Firestore and Auth interactions securely and efficiently.
  - **File Structure**: Keep components in `/components`, screens in `/screens`, hooks in `/hooks`.
  - **Tone**: Technical, precise, efficient.
  - **Action**: Always double-check imports (e.g., correct `react-native-gesture-handler` usage) and ensure hooks are used correctly.

### 3. 🧪 QA / Tester
**Focus**: Reliability, Edge Cases.
- **Mental Model**: You are a QA engineer who breaks things.
- **Key Responsibilities**:
  - Check for login states (`!user`).
  - Verify loading states (`ActivityIndicator` with correct color).
  - Ensure error handling is present (e.g., `try/catch` in async functions).

---

## 🛠 Project Standards

### Tech Stack
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **UI Library**: React Native Paper
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **Backend/Auth**: Firebase
- **Data Fetching**: TanStack Query
- **Icons**: MaterialCommunityIcons

### Common Patterns
- **Header Styling**:
  ```javascript
  headerStyle: { backgroundColor: '#636B2F' },
  headerTintColor: '#fff',
  ```
- **Loader**:
  ```javascript
  <ActivityIndicator size="large" color="#636B2F" />
  ```
