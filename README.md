# Second Opinion AI

Second Opinion AI turns synthetic or de-identified case context and medical records into a cautious, source-grounded discussion guide. It extracts each record, reconstructs a timeline, identifies supporting and conflicting evidence, produces questions for a licensed clinician, and supports report-grounded follow-up questions through Ask AI.

The interface supports English and Vietnamese end to end. The selected language is remembered in the browser, updates accessible labels and date formatting, becomes the default report language for new cases, and the Gemini synthesis prompt generates the clinical report in that language.

> Use only synthetic or properly de-identified records. This service is not medical advice, a diagnosis, an emergency service, or a production/compliance solution.

The public `/demo` route is instant, read-only, and makes no Firebase writes or Gemini calls.

Ask AI is available on authenticated, completed cases. It uses the same configured Gemini model and the same validated report/source data as the assessment. Follow-up questions and answers are kept only in the current browser session and are not written to Firestore. Returned record citations are validated against the case before the response reaches the browser.

## Spark-only Firebase architecture

The Firebase data project must remain on the **Spark plan** with no billing account linked. The app uses only:

- Firebase Authentication with Google and email/password sign-in
- Cloud Firestore (Standard edition) for case context, record metadata, structured extracts, and reports
- Google Analytics, only after consent

It does **not** use Firebase Storage, Cloud Functions, App Hosting, or Firebase AI Logic. A raw record is posted to the authenticated Next.js server, validated, extracted immediately, and deleted from server temporary storage in a `finally` block. PDF/image copies sent to the Gemini Files API are explicitly deleted too. Only the validated structured extract remains in Firestore. A failed extraction therefore requires the original file to be selected again.

Firebase lists Cloud Storage and Google Cloud infrastructure products as unavailable on Spark. For an online deployment, run Next.js in a **different Google Cloud runtime project with billing enabled**. That project hosts Cloud Run, Cloud Build, Artifact Registry, and Secret Manager; it does not change the Firebase data project's Spark plan. See the official [Firebase pricing table](https://firebase.google.com/pricing) and [Firebase billing-plan guide](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

```text
Browser
  ├─ Firebase sign-in / Firestore listeners ──> Firebase data project (Spark)
  └─ authenticated raw-file request ────────> Cloud Run runtime project (billed)
                                                   ├─ temporary request file (deleted)
                                                   ├─ Gemini extraction
                                                   └─ structured extract ──> Firestore
```

The Spark Firestore no-cost quota for one database includes 1 GiB stored, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, and 10 GiB/month outbound transfer; current details are in [Firestore pricing](https://firebase.google.com/docs/firestore/pricing). Quotas are limits, not a production capacity guarantee. The separate runtime project can incur Cloud Run, build, artifact, logging, network, Secret Manager, and Gemini costs. A budget alert notifies but does not cap spending.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Firebase Web SDK for Authentication, Firestore, and consent-gated Analytics
- Firebase Admin SDK using Application Default Credentials
- Gemini Developer API via `@google/genai`; the key stays server-side
- Zod structured-output validation, Mammoth DOCX extraction, and magic-byte validation
- Vitest, Playwright, and a non-root standalone Docker image

## Prerequisites

- Node.js 22 and npm
- Firebase CLI and Google Cloud CLI
- One Firebase data project that stays on Spark
- For deployment only: a second, billing-enabled Google Cloud runtime project
- A Google AI Studio Gemini API key

## 1. Configure the Firebase Spark project

Use `FIREBASE_PROJECT_ID` below for the project that holds user data.

1. Create a Firebase project and leave it on Spark. Do not attach a billing account.
2. Add a Web App and copy its public configuration.
3. Enable both **Authentication → Sign-in method → Email/Password** and **Google**. Turn on the first Email/Password switch; the passwordless email-link switch is not required.
4. Create one Firestore Standard database. Choose a nearby region; it cannot be changed later.
5. Optionally enable Google Analytics.
6. Deploy only Firestore rules and indexes:

```bash
npm install -g firebase-tools
firebase login
firebase use FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

Do not create a Storage bucket and do not upgrade this project to Blaze. Add `localhost` and, after deployment, the exact Cloud Run hostname under Authentication → Settings → Authorized domains.

## 2. Run locally

Copy `.env.example` to `.env.local` and fill the values:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
FIREBASE_SERVICE_ACCOUNT_BASE64=
FIREBASE_PROJECT_ID=
FIREBASE_WEB_API_KEY=
FIREBASE_AUTH_DOMAIN=your-firebase-project.firebaseapp.com
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
APP_BASE_URL=http://localhost:3000
APP_ENV=development
```

Then authenticate Application Default Credentials against an identity that can access the Firebase project:

```bash
gcloud auth application-default login
npm install
npm run dev
```

`GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json` is also supported. Never commit that file.

### Server credentials for Google AI Studio

Client-side Firebase configuration is not enough for record uploads. Protected API routes verify the Firebase ID token and write structured extraction results through the Firebase Admin SDK. Google AI Studio does not automatically provide Application Default Credentials for your Firebase project.

1. In Firebase Console, open **Project settings → Service accounts** and generate a new private key.
2. Base64-encode the complete downloaded JSON file locally:

```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\path\to\service-account.json")
[Convert]::ToBase64String($bytes) | Set-Clipboard
```

3. In Google AI Studio, add a secret named `FIREBASE_SERVICE_ACCOUNT_BASE64` and paste the encoded value.
4. Keep `FIREBASE_PROJECT_ID` set to the same project ID contained in that service account, then redeploy.
5. Delete the downloaded JSON from your computer after confirming the deployment works, or store it in a secure password/secret manager. Never commit it to GitHub.

On Cloud Run, the preferred alternative remains an attached runtime service account with IAM access to the Firebase project; in that environment the secret is not required.

### Emulators

Only Authentication and Firestore emulators are needed:

```powershell
# terminal 1
firebase emulators:start

# terminal 2
$env:APP_ENV = "emulator"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
npm run dev
```

The Gemini adapter is mocked in automated tests. A manual extraction still uses the configured Gemini API key.

## 3. Deploy using a separate runtime project

The runtime project is deliberately different from the Spark Firebase project. Replace both placeholders carefully:

```bash
export FIREBASE_PROJECT_ID="your-spark-firebase-project"
export RUNTIME_PROJECT_ID="your-billed-cloud-run-project"
export REGION="us-central1"
export RUNTIME_SA="second-opinion-runtime@${RUNTIME_PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project="$RUNTIME_PROJECT_ID"
gcloud iam service-accounts create second-opinion-runtime --project="$RUNTIME_PROJECT_ID" --display-name="Second Opinion runtime"
gcloud projects add-iam-policy-binding "$FIREBASE_PROJECT_ID" --member="serviceAccount:$RUNTIME_SA" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding "$FIREBASE_PROJECT_ID" --member="serviceAccount:$RUNTIME_SA" --role="roles/firebaseauth.viewer"
```

Create the Gemini secret in the runtime project and grant only that runtime service account access. [Cloud Run recommends mounting or exposing Secret Manager secrets through the service configuration](https://cloud.google.com/run/docs/configuring/services/secrets).

```bash
gcloud secrets create GEMINI_API_KEY --replication-policy=automatic --project="$RUNTIME_PROJECT_ID"
read -s GEMINI_KEY
printf %s "$GEMINI_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project="$RUNTIME_PROJECT_ID"
unset GEMINI_KEY
gcloud secrets add-iam-policy-binding GEMINI_API_KEY --project="$RUNTIME_PROJECT_ID" --member="serviceAccount:$RUNTIME_SA" --role="roles/secretmanager.secretAccessor"
```

Deploy from source. The first `APP_BASE_URL` only needs to be valid; update it to the returned service URL immediately afterward.

```bash
gcloud run deploy second-opinion-ai --source . --project="$RUNTIME_PROJECT_ID" --region="$REGION" --allow-unauthenticated --service-account="$RUNTIME_SA" --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest --set-env-vars="GEMINI_MODEL=gemini-3.5-flash,FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID,FIREBASE_WEB_API_KEY=FIREBASE_WEB_API_KEY,FIREBASE_AUTH_DOMAIN=$FIREBASE_PROJECT_ID.firebaseapp.com,FIREBASE_APP_ID=FIREBASE_APP_ID,FIREBASE_MEASUREMENT_ID=FIREBASE_MEASUREMENT_ID,APP_BASE_URL=https://example.invalid,APP_ENV=production" --cpu=1 --memory=1Gi --concurrency=10 --min=0 --max=2 --timeout=900

SERVICE_URL="$(gcloud run services describe second-opinion-ai --project="$RUNTIME_PROJECT_ID" --region="$REGION" --format='value(status.url)')"
gcloud run services update second-opinion-ai --project="$RUNTIME_PROJECT_ID" --region="$REGION" --update-env-vars="APP_BASE_URL=$SERVICE_URL"
```

Replace the literal web configuration placeholders before running the deploy command. Then add the hostname from `SERVICE_URL` to Firebase Authentication authorized domains.

### PowerShell variables

```powershell
$FirebaseProjectId = "your-spark-firebase-project"
$RuntimeProjectId = "your-billed-cloud-run-project"
$Region = "us-central1"
$RuntimeServiceAccount = "second-opinion-runtime@$RuntimeProjectId.iam.gserviceaccount.com"
$RuntimeVariables = "GEMINI_MODEL=gemini-3.5-flash,FIREBASE_PROJECT_ID=$FirebaseProjectId,FIREBASE_WEB_API_KEY=FIREBASE_WEB_API_KEY,FIREBASE_AUTH_DOMAIN=$FirebaseProjectId.firebaseapp.com,FIREBASE_APP_ID=FIREBASE_APP_ID,FIREBASE_MEASUREMENT_ID=FIREBASE_MEASUREMENT_ID,APP_BASE_URL=https://example.invalid,APP_ENV=production"

gcloud run deploy second-opinion-ai --source . --project=$RuntimeProjectId --region=$Region --allow-unauthenticated --service-account=$RuntimeServiceAccount --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" --set-env-vars=$RuntimeVariables --cpu=1 --memory=1Gi --concurrency=10 --min=0 --max=2 --timeout=900
$ServiceUrl = gcloud run services describe second-opinion-ai --project=$RuntimeProjectId --region=$Region --format="value(status.url)"
gcloud run services update second-opinion-ai --project=$RuntimeProjectId --region=$Region --update-env-vars="APP_BASE_URL=$ServiceUrl"
```

## Records and privacy behavior

- PDF, DOCX, TXT, PNG, JPEG, and WebP
- Maximum 10 records, 15 MiB each, and 50 MiB total per case
- Browser extension/MIME checks followed by server magic-byte/content checks
- Raw request files are transient and are not stored in Firebase
- DOCX/TXT normalized text is capped at 150,000 characters and truncation is disclosed
- PDF/image Gemini Files API copies are explicitly deleted; automatic expiry is fallback only
- Only structured extracts and metadata persist in Firestore
- There is no raw-file download feature; retrying a failed extraction requires re-selection

Gemini free-tier content may be used to improve Google products. Do not use identifiable medical data. This prototype makes no HIPAA, clinical, regulatory, security, or production-compliance claim.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

## Deployment smoke test

1. Open `/api/health` and `/demo` while signed out.
2. Sign in and create a synthetic case.
3. Select a supported record and confirm it reaches `extracted` and says the raw file was deleted.
4. Generate a report and verify source chips navigate to structured record summaries.
5. Refresh and confirm case/report state resumes from Firestore.
6. Delete a record and a case; confirm the Firestore documents disappear.
7. Confirm the Firebase console still shows the Spark plan and has no Storage bucket.

## Troubleshooting

- **Firebase is not configured:** fill the four required public Firebase values and restart or redeploy. No Storage bucket variable exists.
- **Google sign-in loops:** enable the Google provider and add the exact localhost or deployed hostname to authorized domains.
- **Email/password sign-in is disabled:** enable Authentication → Sign-in method → Email/Password in the Firebase console. Firebase sends password-reset emails using the template under Authentication → Templates.
- **File upload says server credentials are not configured:** add `FIREBASE_SERVICE_ACCOUNT_BASE64` as described above. A working client login does not prove that the server-side Firebase Admin SDK has credentials.
- **Permission denied from Cloud Run:** confirm the runtime service account from the billed runtime project has `roles/datastore.user` and `roles/firebaseauth.viewer` on the Spark Firebase data project. The viewer role is needed because protected routes check whether ID tokens were revoked.
- **Extraction fails:** re-select the original file. Raw files are deliberately not retained.
- **Invalid DOCX/PDF:** export scans as PDF/image, remove PDF encryption, and retry.
- **Firestore query requests an index:** deploy `firestore.indexes.json` using the Firebase CLI command above.

Firestore rules default-deny. Record and analysis writes are server-only. Protected handlers verify a Firebase ID token, derive ownership from the verified UID, validate inputs, and return safe errors without logging records, extracted text, model output, authorization headers, or secrets.
