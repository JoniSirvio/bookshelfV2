# Bookshelf V2

A React Native mobile application for managing your personal book collection. Search for books using the Finna API, track your reading progress, and organize your library with drag-and-drop ease.

## Features

-   **Search Books**: Integrated with the [Finna API](https://api.finna.fi) to search for books by title, author, or ISBN.
-   **My Shelf**: Add books to your "To Read" list.
-   **Reading Tracking**:
    -   Mark books as "Started Reading" to track days read.
    -   Mark books as "Read" or "Listened".
    -   Add ratings (1-5 stars) and written reviews.
-   **Drag & Drop Reordering**: Long-press to reorder books in your shelf.
-   **Swipe Actions**:
    -   **Swipe Right**: Mark as Read (in Home) or Add to Shelf (in Search).
    -   **Swipe Left**: Delete book.
-   **Persistence**: Your library and reading history are saved locally using AsyncStorage.

## Tech Stack

-   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
-   **Language**: TypeScript
-   **UI Library**: [React Native Paper](https://callstack.github.io/react-native-paper/)
-   **Navigation**: React Navigation (Bottom Tabs, Native Stack)
-   **Animations & Gestures**:
    -   `react-native-reanimated`
    -   `react-native-gesture-handler`
    -   `react-native-draggable-flatlist`
    -   `react-native-swipeable-item`
-   **Icons**: `react-native-vector-icons` (MaterialCommunityIcons)
-   **Storage**: `@react-native-async-storage/async-storage`
-   **Networking**: Axios

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd bookshelfV2
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Start the application**:
    ```bash
    npx expo start -c
    ```

4.  **Run on device/emulator**:
    -   Scan the QR code with the Expo Go app (Android/iOS).
    -   Press `a` for Android Emulator.
    -   Press `i` for iOS Simulator.

## Usage

### Home Screen (My Shelf)
-   View your current reading list.
-   **Long Press**: Drag and drop to reorder books.
-   **Swipe Right**: Mark a book as "Read". A modal will appear to let you rate and review the book.
-   **Swipe Left**: Remove a book from your shelf.
-   **Tap**: View book details or start reading.

### Search Screen
-   Search for new books.
-   **Swipe Right**: Add a book to your shelf.
-   **Tap**: View book details.

### Read History
-   View a list of all books you have finished.
-   See your ratings, reviews, and reading duration.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
