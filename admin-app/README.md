# BookShelf Admin

Admin web app for BookShelf: view users, their books, and AI usage; manage accounts and admin claims.

## Setup

1. **Env**: Copy `.env.example` to `.env` and fill with your Firebase config (same project as the main app). You can copy from the main app `.env` and rename `EXPO_PUBLIC_*` to `VITE_*`.

2. **First admin**: Someone must have the `admin` custom claim. Run once (from project root):
   ```bash
   cd functions && npm install
   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json node scripts/set-admin.js your@email.com
   ```
   Get the service account key from Firebase Console → Project settings → Service accounts → Generate new private key. Alternatively use the root script: `node scripts/bootstrap-admin.js your@email.com` after `npm install firebase-admin` in the project root.

## Dev

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with an admin account.

## Deploy

1. Deploy Cloud Functions (from project root):
   ```bash
   cd functions && npm install && npm run build && cd ..
   firebase deploy --only functions
   ```

2. Build and deploy Hosting:
   ```bash
   cd admin-app && npm install && npm run build && cd ..
   firebase deploy --only hosting
   ```

Or from root: `firebase deploy` (deploys rules, functions, and hosting).
