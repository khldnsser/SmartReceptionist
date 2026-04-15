# Setup Guide

Complete guide to get the clinic AI receptionist running locally. Follow in order.

---

## 1. Prerequisites

- Node.js 18+ installed
- npm installed
- A phone number NOT registered on any WhatsApp account
- A Google account
- An OpenAI account

Install dependencies:
```bash
npm install
```

Copy the env template:
```bash
cp .env.example .env
```

---

## 2. Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com) and create/access a Business Account

---

## 3. WhatsApp Business Account

1. In Meta Business Suite sidebar → **Accounts** → **WhatsApp accounts** → **Create account**
2. Enter account name and currency
3. Verify a phone number via SMS or call

---

## 4. Meta App

1. Meta Business Suite sidebar → **Apps and websites** → **Apps** → **Create App**
2. Choose **Business** type, name it, and create
3. In the app dashboard → **Add products** → find **WhatsApp** → **Set up**
4. Link your WhatsApp Business Account from step 3

### How WABA, App, and Token relate

```
WABA (your WhatsApp presence)
  ← App (API gateway with permission to access WABA)
    ← System User Token (credentials your code uses)
```

The token is issued by a System User, scoped to an App, which has permission to access the WABA.

---

## 5. WhatsApp Credentials

### Phone Number ID
1. In your app dashboard → **WhatsApp** → **API Setup**
2. Copy the **Phone Number ID** under your verified number

→ Set `WHATSAPP_PHONE_NUMBER_ID` in `.env`

### API Token
1. Meta Business Suite → **Settings** → **Users** → **Add** a System User (Admin role)
2. Click the user → **Generate token** → select your app → generate
3. Copy the token immediately (starts with `EAA...`)

→ Set `WHATSAPP_API_TOKEN` in `.env`

### Verify Token
Generate a random string:
```bash
openssl rand -hex 32
```

→ Set `WHATSAPP_VERIFY_TOKEN` in `.env`

### App Secret
1. App dashboard → **Settings** → **Basic** → **App Secret** → **Show**

→ Set `WHATSAPP_APP_SECRET` in `.env`

---

## 6. OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. **API keys** → **Create new secret key** → copy it

→ Set `OPENAI_API_KEY` in `.env`
→ Set `OPENAI_MODEL=gpt-4o-mini` (or leave default)

---

## 7. Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable these APIs: **Google Calendar API**, **Google Sheets API**, **Gmail API**

### Service Account (for Calendar + Sheets)
1. **Credentials** → **Create Credentials** → **Service Account**
2. Name it, grant **Editor** role, click **Done**
3. Click the service account → **Keys** → **Add Key** → **Create new key** → **JSON**
4. A JSON file downloads — place it in your project root as `google-service-account.json`

→ Set `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-service-account.json` in `.env`

**Important:** Note the `"client_email"` in the JSON file — you'll need it for sharing.

---

## 8. Google Calendar

1. Open [calendar.google.com](https://calendar.google.com)
2. Create a new calendar (or use existing)
3. Calendar settings → **Integrate calendar** → copy the **Calendar ID**
4. Calendar settings → **Share with people and groups** → **Add people**
   - Paste the service account's `client_email` from the JSON file
   - Set permission to **Editor**
   - Click **Share**

→ Set `GOOGLE_CALENDAR_ID` in `.env`

---

## 9. Google Sheets

1. Create a new [Google Sheet](https://sheets.google.com)
2. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Rename the first tab to `Appointments`
4. Add this header row:
   ```
   Email | Name | Phone | Time Zone | Appointment Date | Booking Status | Intake Form | Reminder Sent
   ```
5. Click **Share** (top right) → paste the service account's `client_email` → **Editor** → **Share**

→ Set `GOOGLE_SHEET_ID` in `.env`
→ Set `GOOGLE_SHEET_NAME=Appointments` in `.env`

---

## 10. Gmail OAuth2

### Create OAuth Client
1. Google Cloud Console → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Type: **Web application**
3. Add redirect URI: `http://localhost:3000/auth/callback`
4. Click **Create** → copy **Client ID** and **Client Secret**

→ Set `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in `.env`
→ Set `GMAIL_SENDER` to the clinic Gmail address in `.env`

### Get Refresh Token

**Your app must be running first.** The `/auth/callback` endpoint exchanges the code automatically.

1. Start the app: `npm run dev`
2. Open this URL in your browser (replace `{CLIENT_ID}`):
   ```
   https://accounts.google.com/o/oauth2/v2/auth?client_id={CLIENT_ID}&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&prompt=consent
   ```
3. Sign in with the clinic Gmail account and click **Allow**
4. The page will display your refresh token — copy it

→ Set `GMAIL_REFRESH_TOKEN` in `.env`

**How this works:** Google doesn't connect to your localhost. Your browser does the redirect locally. Google just tells your browser where to go.

**If you get "localhost refused to connect":** Your app isn't running. Run `npm run dev` first.

**If you get "Cannot GET /auth/callback":** The route is missing from `src/server.ts`. It should already be there.

**If no refresh token appears:** You may have authorized before. Go to [myaccount.google.com/connections](https://myaccount.google.com/connections) → remove the app → try again.

---

## 11. ngrok (Local Webhook Tunnel)

Meta requires a public HTTPS URL for webhooks. ngrok tunnels your localhost to a public URL.

### Install and authenticate
```bash
brew install ngrok
```

1. Create account at [ngrok.com](https://ngrok.com) and **verify your email**
2. Get auth token from https://dashboard.ngrok.com/auth/your-authtoken
3. Authenticate:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

### Start the tunnel
```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok-free.dev`).

**If you get "account may not start an endpoint until email is verified":** Verify your email at https://dashboard.ngrok.com/user/settings, then restart ngrok.

**Note:** Free tier ngrok URLs change on restart. Update Meta webhook each time.

---

## 12. Configure Webhook in Meta

**Do this at [developers.facebook.com](https://developers.facebook.com), NOT business.facebook.com.**

1. Go to **My Apps** → your app → **WhatsApp** → **Configuration**
2. Under **Webhook** → **Edit**
3. Set **Callback URL** to: `https://YOUR-NGROK-URL/webhook`
   - The `/webhook` path is required — don't forget it!
4. Set **Verify token** to your `WHATSAPP_VERIFY_TOKEN` value (must match `.env` exactly)
5. Click **Verify and save**
6. Scroll down to **Webhook fields** → find **messages** → click **Subscribe**

**Prerequisites:** Both `npm run dev` and `ngrok http 3000` must be running.

---

## 13. Run and Test

### Start everything (3 terminals)

```bash
# Terminal 1: App
npm run dev

# Terminal 2: ngrok
ngrok http 3000
```

### Verify endpoints

```bash
# Health check
curl https://YOUR-NGROK-URL/health

# Webhook verification
curl "https://YOUR-NGROK-URL/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"

# Manual webhook POST
curl -X POST https://YOUR-NGROK-URL/webhook -H "Content-Type: application/json" -d '{"test":"message"}'
```

### Send a WhatsApp message

From your personal WhatsApp, send a message to your clinic's number. Check the app terminal for logs.

---

## 14. Troubleshooting

### "The callback URL or verify token couldn't be validated"
- Is the app running? (`npm run dev`)
- Is ngrok running? (`ngrok http 3000`)
- Does the callback URL end with `/webhook`?
- Does the verify token match `.env` exactly? (no extra spaces)

### Health check works but no logs on WhatsApp message
Meta isn't delivering webhooks. Go to **developers.facebook.com** → your app → **WhatsApp** → **Configuration**:
- Verify the callback URL is correct
- Verify `messages` webhook field is **subscribed** (green checkmark)

### Manual curl works but WhatsApp messages don't trigger logs
Same as above — the webhook subscription at developers.facebook.com is the issue.

### "Phone number not in allowlist"
Complete business verification in Meta Business Suite, or test with the verified phone number.

### Agent errors in logs
- Check `OPENAI_API_KEY` is valid
- Check Google service account JSON file exists and path is correct
- Check Calendar and Sheet are shared with the service account email

---

## Environment Variables Reference

| Variable | Format | Source |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Numeric string | Meta App → WhatsApp → API Setup |
| `WHATSAPP_API_TOKEN` | `EAA...` string | System User → Generate Token |
| `WHATSAPP_VERIFY_TOKEN` | Random hex string | You create: `openssl rand -hex 32` |
| `WHATSAPP_APP_SECRET` | Alphanumeric | App → Settings → Basic → App Secret |
| `OPENAI_API_KEY` | `sk-...` string | platform.openai.com → API keys |
| `OPENAI_MODEL` | Model name | Default: `gpt-4o-mini` |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | File path | Downloaded JSON key |
| `GOOGLE_CALENDAR_ID` | `...@group.calendar.google.com` | Calendar settings → Integrate |
| `GOOGLE_SHEET_ID` | Alphanumeric | From sheet URL |
| `GOOGLE_SHEET_NAME` | Sheet tab name | Default: `Appointments` |
| `GMAIL_CLIENT_ID` | `...apps.googleusercontent.com` | Google Cloud → Credentials |
| `GMAIL_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud → Credentials |
| `GMAIL_REFRESH_TOKEN` | `1//...` | OAuth flow (step 10) |
| `GMAIL_SENDER` | Email address | Clinic's Gmail |
| `PORT` | Integer | Default: `3000` |
| `TIMEZONE` | IANA string | Default: `Asia/Beirut` |
| `APPOINTMENT_DURATION_MIN` | Integer | Default: `30` |
| `OFFICE_HOURS_AM_START` | `HH:MM` | Default: `09:00` |
| `OFFICE_HOURS_AM_END` | `HH:MM` | Default: `12:00` |
| `OFFICE_HOURS_PM_START` | `HH:MM` | Default: `13:00` |
| `OFFICE_HOURS_PM_END` | `HH:MM` | Default: `17:00` |
| `MIN_BOOKING_LEAD_HOURS` | Integer | Default: `24` |
| `SLOTS_TO_OFFER` | Integer | Default: `5` |
