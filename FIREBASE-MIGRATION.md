# Workshop Desk on Firebase Spark

This is the separate Firebase project `workshop-desk` for `kriksanta/workshopdesk`. It uses Firebase Hosting, Firestore and Firebase Authentication. No Cloud Functions, paid billing plan or SMS sign-in is required. The existing Google Sheets / Apps Script deployment stays available during cutover.

Build the site with `npm install` and `npm run build:firebase`, then run `npm run test:firebase`. Deploy from the repository root with `firebase deploy --project workshop-desk --only firestore:rules,hosting`. Hosting serves `firebase-public/`.

The owner signs in with the Google account `sreejithsubhashrecy@gmail.com`. This identity is pinned in `firestore.rules`; changing owners requires a reviewed rules change and redeployment. Employees sign in with email and password. An owner can create an employee account from the Employees form using a new email and initial password. Password resets use Firebase's email link. Removed employees retain their history but Firestore rules block their workshop access.

## Migrating the current Google Sheet

Export the private `WorkshopDesk_Data` tab from the original `workshopdesk` Google Sheet as an XLSX workbook. Run `work/firebase/prepare-migration.py <export.xlsx> .migration/legacy.json` with a Python environment that has `openpyxl`. The `.migration/` directory is ignored by Git and must stay private.

After the owner logs in to the Firebase site, append `?import=1` to its URL and use **Import Sheet** to select `.migration/legacy.json`. Import refuses to overwrite an existing collection of operational records. It preserves customers, jobs, invoices, attendance, inventory and workshop settings, including the logo. It does not copy the old Apps Script password verifiers. The exported source should be kept as a backup until record counts and documents are checked in Firebase.

The current sheet has 203 catalog parts and three employee records. None of those employee records has an email address. The owner must edit each active employee, supply a real email address, and set an initial Firebase password before that employee can sign in. The old phone numbers remain contact numbers, not login names.

Firebase stores each record in its own Firestore document. Job service statuses and stock issues have separate documents so employee changes can be restricted by security rules. Firestore listeners update the app without a logout or manual reload. Firebase Authentication retains the signed-in account across a browser refresh; the app saves the current page locally.

The free Spark plan has usage limits. Monitor Firestore and Hosting usage in Firebase Console as workshop activity grows. Keep the sheet and Apps Script as a read-only backup after checking the Firebase version.
