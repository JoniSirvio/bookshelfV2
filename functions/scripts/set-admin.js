/**
 * Set admin custom claim for a user by email. Run from functions directory:
 *   node scripts/set-admin.js admin@example.com
 * Requires GOOGLE_APPLICATION_CREDENTIALS or default credentials.
 */
const admin = require("firebase-admin");
const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin.js <email>");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp();
}

admin
  .auth()
  .getUserByEmail(email)
  .then((user) => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
  .then(() => console.log("Admin claim set for:", email))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
