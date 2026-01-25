---
description: Discuss the technical trade-offs for Audiobook Implementation (Expo Go vs Dev Client).
---

1. **Adopt Persona**:
   - **👔 Product Owner** (Strategy) + **👨‍💻 Tech Lead** (Technical nuance).

2. **Core Conflict**:
   - The user develops/tests in **Expo Go**.
   - The user deploys via **EAS** (Production).
   - **Audio** handling is one of the few areas where Expo Go has limitations compared to custom builds.

3. **Comparison**:

   ### **Option A: `expo-av` (The "Safe" Path)**
   - **Pros**:
     - Works perfectly in **Expo Go**. You can code, save, and see it work on your phone immediately.
     - Built-in to Expo, no extra native setup.
     - Handles basic background audio (audio keeps playing when you switch apps).
   - **Cons**:
     - **Limited Lock Screen Controls**: You cannot easily customize the media notification (play/pause/artwork on lock screen) natively. It's very basic.
     - Less robust for "playlists" or complex queuing logic (you have to build it manually).
   - **Verdict**: Best for rapid development if Lock Screen controls aren't a dealbreaker for MVP.

   ### **Option B: `react-native-track-player` (The Pro Path)**
   - **Pros**:
     - Industry standard for podcast/music apps.
     - **Native Lock Screen UI**: Shows artwork, title, chapter progress, and play/pause buttons on the lock screen / control center.
     - Handles interruptions (phone calls, navigation voices) much better.
   - **Cons**:
     - **DOES NOT WORK in Expo Go**. It includes custom native code that the generic Expo Go app doesn't have.
     - **Testing Workflow Change**: You must build a "Development Client" (`eas build --profile development --platform ios/android`).
       - *What is a Dev Client?* It's basically your *own* version of the Expo Go app, but with your specific native libraries installed. You install it on your phone once, and then you can still use hot-reloading (connect to bundler) just like Expo Go.
       - *Friction*: You have to wait for the build (15-20 mins) every time you add a *new* native library (like tracking player).

4. **Recommendation**:
   *   Since you **"always test on Expo Go"**, switching to a Development Client workflow is a significant change in habit.
   *   **Strategy**: Start with **`expo-av`**.
       *   It lets you build the UI, the syncing logic, and the streaming *right now* in Expo Go.
       *   It plays audio in background.
       *   The *only* thing missing is the fancy lock screen controls.
       *   If that becomes a must-have later, migrating the core logic to `track-player` is a manageable task, but let's not break your workflow for the MVP.

5. **Plan**:
   - Proceed with **`expo-av`** for the MVP.
