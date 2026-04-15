# Environment Variables Setup Guide

This guide explains each environment variable required to run the clinic AI receptionist, where to obtain it, and the expected format.

## WhatsApp Cloud API

### `WHATSAPP_PHONE_NUMBER_ID`
- **Format:** Numeric string (20+ digits)
- **Where to get it:**
  1. Go to [Meta Business Platform](https://business.facebook.com)
  2. Select your Business Account
  3. Go to "WhatsApp" → "Getting Started"
  4. Create or select a WhatsApp Business Account
  5. Find the Phone Number ID in the API section
- **Example:** `930238750162283`

### `WHATSAPP_API_TOKEN`
- **Format:** Long alphanumeric string (starts with `EAA...`)
- **Where to get it:**
  1. In Meta Business Platform, go to System Users
  2. Create a new system user with "Admin" access
  3. Create an app or use existing Business App
  4. Generate a temporary access token via "Generate Token"
  5. Or use an app token with `whatsapp_business_messaging` permission
- **Important:** Store securely and rotate periodically
- **Example:** `EAABsbCS1iHgBAOZBWZCVZBd...`

### `WHATSAPP_VERIFY_TOKEN`
- **Format:** Any alphanumeric string you choose (min 20 chars recommended)
- **Where to get it:**
  - You create this value yourself — it's not from Meta
  - Used to verify that webhook POST requests come from Meta
  - You provide this to Meta when registering the webhook URL
- **Example:** `my_random_verify_token_12345`

### `WHATSAPP_APP_SECRET`
- **Format:** Alphanumeric string (used for HMAC signature verification)
- **Where to get it:**
  1. In your Meta App settings, go to "Settings" → "Basic"
  2. Find "App Secret" — you may need to verify your identity
  3. Click "Show" to reveal it
- **Important:** Keep this secret; used to validate webhook authenticity
- **Example:** `a1b2c3d4e5f6g7h8i9j0...`

## OpenAI

### `OPENAI_API_KEY`
- **Format:** Starts with `sk-` followed by alphanumeric string
- **Where to get it:**
  1. Go to [OpenAI Platform](https://platform.openai.com)
  2. Sign in or create an account
  3. Go to "API keys" in the left sidebar
  4. Click "Create new secret key"
  5. Copy it immediately (you can't see it again)
- **Important:** Keep this secret; treat it like a password
- **Example:** `sk-proj-abc123def456...`

### `OPENAI_MODEL`
- **Format:** Model identifier string
- **Where to get it:** This is a fixed value from OpenAI's model list
- **Current default:** `gpt-4o-mini` (fast, efficient for this use case)
- **Other options:** `gpt-4o`, `gpt-4-turbo` (more capable but slower/expensive)
- **Recommendation:** Keep as `gpt-4o-mini` unless you need more advanced reasoning

## Google Cloud (Service Account)

### `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`
- **Format:** File path to a JSON credentials file
- **Where to get it:**
  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Create a new project (or use existing)
  3. Enable these APIs:
     - Google Calendar API
     - Google Sheets API
     - Gmail API
  4. Create a Service Account:
     - Go to "Credentials" → "Create Credentials" → "Service Account"
     - Fill in the name and description
     - Click "Create and Continue"
     - Grant these roles: Editor (or more restrictive: Calendar Admin, Sheets Editor)
     - Click "Done"
  5. Create a key for the service account:
     - In "Service Accounts", click the newly created account
     - Go to "Keys" tab → "Add Key" → "Create new key"
     - Choose "JSON" format
     - Click "Create" — the file will download automatically
  6. Place the downloaded JSON file in your project directory (e.g., `./google-service-account.json`)
- **Example value:** `./google-service-account.json`
- **JSON structure looks like:**
  ```json
  {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "your-sa@your-project.iam.gserviceaccount.com",
    ...
  }
  ```

### `GOOGLE_CALENDAR_ID`
- **Format:** Email-like string ending with `@group.calendar.google.com`
- **Where to get it:**
  1. Open [Google Calendar](https://calendar.google.com)
  2. On the left sidebar, right-click the calendar you want to use (or click the three dots next to it)
  3. Click "Settings and sharing"
  4. Scroll down to find the "Integrate calendar" or "Calendar ID" section
  5. **Copy the Calendar ID** (looks like `abc123@group.calendar.google.com`)

- **Critical Step — Grant Calendar Access to Service Account:**
  1. Still in the calendar settings page from above
  2. Find the **"Share with people and groups"** section (near the top)
  3. Click **"Add people"** or **"Share"**
  4. In the email field, paste your service account email (from the Google Cloud JSON file):
     - This looks like: `your-sa-name@your-project-id.iam.gserviceaccount.com`
     - You can find it by opening the downloaded JSON file and looking for the `"client_email"` field
  5. In the permission dropdown, select **"Editor"** (not Viewer)
  6. Click **"Share"** or **"Send invitation"**

  **Why?** The service account (robot account) needs permission to create, read, and delete calendar events. Without this share, the app will get "permission denied" errors.

- **Example Calendar ID:** `1db81a9623ebc8509e0d8f12668af0d4a26daec12f6826648a8bbaec4e2070f2@group.calendar.google.com`

### `GOOGLE_SHEET_ID`
- **Format:** Long alphanumeric string (found in the Google Sheet URL)
- **Where to get it:**
  1. Create a new [Google Sheet](https://sheets.google.com)
  2. Open it in your browser
  3. The URL looks like: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0`
  4. **Copy the `{SHEET_ID}` part** (the long alphanumeric string)
  5. Rename the first sheet tab to `Appointments` (right-click the sheet tab at the bottom, click "Rename")
  6. Add a header row with these exact columns:
     ```
     Email | Name | Phone | Time Zone | Appointment Date | Booking Status | Intake Form | Reminder Sent
     ```

- **Critical Step — Grant Sheet Access to Service Account:**
  1. Click the **Share** button (top right of the sheet)
  2. In the "Share with people and groups" dialog, paste your service account email:
     - This looks like: `your-sa-name@your-project-id.iam.gserviceaccount.com`
     - Find it in the downloaded JSON file under `"client_email"`
  3. Set permission to **"Editor"** (not Viewer or Commenter)
  4. Click **"Share"** (you don't need to send an email since it's a robot account)

  **Why?** The service account needs permission to read and update patient records in the sheet. Without this, the app will get access denied errors.

- **Example Sheet ID:** `1_gsZlYjYo3_baWAjUMi2_zJeWDtTtfD3mz_UnkkUFz0`

### `GOOGLE_SHEET_NAME`
- **Format:** The name of the sheet tab (case-sensitive)
- **Default:** `Appointments`
- **Where to set it:** Rename the sheet tab in your Google Sheet to match this value

## Gmail (OAuth2)

Setting up Gmail requires OAuth2. Follow these steps **once** to get the credentials.

### How OAuth Redirect URIs Work

When you authorize the app to use Gmail, the flow involves a **redirect URI**:

```
1. Your browser → Google's servers (with authorization request)
                   (includes redirect_uri parameter)

2. User authorizes on Google's consent screen

3. Google redirects the BROWSER to: http://localhost:3000/auth/callback?code=...
   (Google doesn't connect to localhost — your browser does the redirect!)

4. Your local app receives the code at localhost:3000/auth/callback

5. Your local app exchanges the code for a refresh_token (server-to-server)
```

**Key insight:** Google doesn't need to "reach" your localhost. The redirect happens in your browser, which is already on your machine. Google just tells the browser where to go.

### Step 1: Create an OAuth2 Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (for local dev)
   - `https://your-domain.com/auth/callback` (for production — see `REDIRECT_URI_PRODUCTION.md`)
5. Click "Create"
6. Copy the **Client ID** and **Client Secret** (keep the secret safe)

### `GMAIL_CLIENT_ID`
- **Format:** Long alphanumeric string ending with `.apps.googleusercontent.com`
- **Example:** `123456789-abc123...apps.googleusercontent.com`

### `GMAIL_CLIENT_SECRET`
- **Format:** Alphanumeric string (keep secret!)
- **Example:** `GOCSPX-abc123...`

### Step 2: Get the Refresh Token

**Prerequisites — do these BEFORE starting the OAuth flow:**
1. Your app must be running (`npm run dev`)
2. The `/auth/callback` endpoint must exist in `src/server.ts` (already implemented)
3. `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` must be set in your `.env` file
4. Verify the app is running: `curl http://localhost:3000/health` should respond with `{"status":"ok",...}`

**Now start the OAuth flow:**

1. Open this URL in your browser (replace `{CLIENT_ID}` with your actual Client ID):
   ```
   https://accounts.google.com/o/oauth2/v2/auth?client_id={CLIENT_ID}&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&prompt=consent
   ```
2. Sign in with the Gmail account that will send confirmation emails
3. Click "Allow" when prompted for permissions
4. You'll be redirected to `http://localhost:3000/auth/callback?code=...`
5. Your app will automatically exchange the code for a refresh token and display it on the page
6. **Copy the refresh token** from the page

**If you prefer to exchange the code manually** (e.g., if the `/auth/callback` endpoint isn't implemented), copy the code from the redirect URL and run:
```bash
curl -X POST https://oauth2.googleapis.com/token -d "client_id={GMAIL_CLIENT_ID}" -d "client_secret={GMAIL_CLIENT_SECRET}" -d "code={AUTHORIZATION_CODE}" -d "grant_type=authorization_code" -d "redirect_uri=http://localhost:3000/auth/callback"
```

The response will include a `"refresh_token": "..."` — copy this value.

### Troubleshooting the OAuth Flow

#### "This site can't be reached — localhost refused to connect"
Your app isn't running. Start it first:
```bash
npm run dev
```
Then try the OAuth flow again.

#### "Cannot GET /auth/callback"
The `/auth/callback` endpoint doesn't exist in your app. Make sure `src/server.ts` contains the `app.get('/auth/callback', ...)` route handler. If it's missing, add it (see `REDIRECT_URI_PRODUCTION.md` for the implementation).

#### "No refresh token in response"
- You may have already authorized this app before. Google only sends the refresh token on the **first** authorization.
- Fix: go to https://myaccount.google.com/connections → find your app → click **Remove access** → try the OAuth flow again
- Make sure `prompt=consent` is in the OAuth URL (forces the consent screen)

### `GMAIL_REFRESH_TOKEN`
- **Format:** Alphanumeric string starting with `1//...` or similar
- **Obtained from:** Step 2 above
- **Example:** `1//0gFfYuGKpU...`

### `GMAIL_SENDER`
- **Format:** Email address (the clinic's email that will send confirmations)
- **Example:** `clinic@example.com`
- **Note:** This should match the Gmail account you used to get the refresh token

## Business Logic Configuration

### `TIMEZONE`
- **Format:** IANA timezone string
- **Default:** `Asia/Beirut`
- **Where to get it:** Use [this timezone list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- **Example:** `Asia/Beirut`, `America/New_York`, `Europe/London`

### `APPOINTMENT_DURATION_MIN`
- **Format:** Integer (minutes)
- **Default:** `30`
- **Purpose:** Length of each appointment slot

### Office Hours (Mon-Fri)

#### `OFFICE_HOURS_AM_START`
- **Format:** `HH:MM` in 24-hour format
- **Default:** `09:00`

#### `OFFICE_HOURS_AM_END`
- **Format:** `HH:MM` in 24-hour format
- **Default:** `12:00`

#### `OFFICE_HOURS_PM_START`
- **Format:** `HH:MM` in 24-hour format
- **Default:** `13:00`

#### `OFFICE_HOURS_PM_END`
- **Format:** `HH:MM` in 24-hour format
- **Default:** `17:00`

### `MIN_BOOKING_LEAD_HOURS`
- **Format:** Integer (hours)
- **Default:** `24`
- **Purpose:** Minimum hours in advance a patient must book

### `SLOTS_TO_OFFER`
- **Format:** Integer (number of slots)
- **Default:** `5`
- **Purpose:** Number of available time slots to show the patient

## Server

### `PORT`
- **Format:** Integer port number
- **Default:** `3000`
- **Purpose:** HTTP port for the Express server
- **Example:** `3000`, `8080`, `5000`

---

## Quick Setup Checklist

- [ ] Create WhatsApp Business Account and get Phone Number ID + API Token
- [ ] Generate `WHATSAPP_VERIFY_TOKEN` (random string, 20+ chars)
- [ ] Get App Secret from Meta
- [ ] Create OpenAI API key
- [ ] Create Google Cloud project and enable Calendar, Sheets, Gmail APIs
- [ ] Create Service Account and download JSON key
- [ ] Create/select Google Calendar and share with service account
- [ ] Create Google Sheet with proper headers, share with service account
- [ ] Create OAuth2 Client ID and Secret for Gmail
- [ ] Get Gmail Refresh Token via OAuth flow
- [ ] Copy `.env.example` to `.env` and fill in all values
- [ ] Test: `npm run dev`

---

## Security Notes

1. **Never commit `.env` to git** — add it to `.gitignore`
2. **Keep secrets secret** — API keys, tokens, and secrets should never be exposed
3. **Rotate tokens periodically** — especially WhatsApp API tokens
4. **Use environment variables in production** — don't hard-code secrets
5. **Restrict permissions** — use least-privilege access for service accounts and OAuth scopes
