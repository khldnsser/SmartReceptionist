# Complete Meta/WhatsApp Setup Guide

Follow these steps **in order** to set up all the infrastructure needed for the app. You'll end up with all the credentials you need to fill in `.env`.

---

## Phase 1: Meta Business Account Setup

### Step 1.1: Create or Access Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com)
2. If you don't have an account:
   - Click "Create account"
   - Enter your name, business email, and password
   - Verify your email
3. If you already have one, just log in

**What you get:** A Business Account that owns all your Meta assets (apps, WABA, etc.)

---

## Phase 2: WhatsApp Business Account Setup

### Step 2.1: Create WhatsApp Business Account

1. In Meta Business Suite, go to the **sidebar** → **Accounts** → **WhatsApp accounts**
2. Click **Create account**
3. Fill in:
   - **Account name:** e.g., "Clinic WhatsApp"
   - **Currency:** Your local currency
4. Click **Create account**

**What you get:** A WhatsApp Business Account (WABA) — the actual WhatsApp entity

### Step 2.2: Verify Your Phone Number

1. You'll be asked to verify a phone number (this becomes your clinic's WhatsApp number)
2. Choose your country and enter the phone number
3. Choose verification method: **SMS** or **Call**
4. Enter the code you receive
5. Click **Verify**

**Important:** This phone number must:
- Not already be registered to a personal WhatsApp account
- Be reachable and able to receive SMS/calls
- Be the clinic's main phone number

### Step 2.3: Complete Business Verification (Recommended)

1. In WhatsApp settings, go to **Account info** → **Business verification**
2. Upload business documents:
   - Business registration
   - Tax ID / VAT certificate
   - Utility bill (proof of address)
3. Submit for verification

**Why?** Unverified accounts have message limits. Verification lifts them.

---

## Phase 3: Meta App Setup

### Step 3.1: Create a Meta App

1. In Meta Business Suite, go to **sidebar** → **Apps and websites** → **Apps**
2. Click **Create App**
3. Choose app type: **Business** (not Consumer)
4. Fill in:
   - **App name:** e.g., "Clinic AI Receptionist"
   - **App contact email:** Your business email
   - **App purpose:** "Automate customer communications" or similar
5. Click **Create app**
6. Complete the security check (may require 2FA verification)

**What you get:** A Meta App that can access APIs

### Step 3.2: Add WhatsApp Product to the App

1. You're now in your app's dashboard
2. Go to **Add products**
3. Find **WhatsApp** and click **Set up**
4. Choose your WABA from Step 2.1 (should appear in the dropdown)
5. Click **Get started**

**What this does:** Links your app to your WABA, allowing it to send/receive messages

### Understanding the WABA / App / Token Relationship

Before proceeding, understand how these three pieces relate:

```
WhatsApp Business Account (WABA)
│   Your actual WhatsApp presence — the phone number, settings, message history.
│
├── Meta App
│   │   A gateway/middleware that accesses the WABA via API.
│   │   The app itself doesn't "own" messages — it's the doorway.
│   │
│   └── System User Token
│       An API token issued by a System User, scoped to this app.
│       This token is what your code uses to authenticate API calls.
│
│   Flow: Your Code → (token) → App → (permission) → WABA
```

**Key points:**
- The **WABA** is the business entity (phone number, settings)
- The **App** is the API gateway that connects to the WABA
- The **Token** is generated from a System User and scoped to the app
- The token connects **through the app** to the WABA — it doesn't connect directly

---

## Phase 4: Get WhatsApp API Credentials

### Step 4.1: Get Phone Number ID

1. In your app dashboard, go to **WhatsApp** → **Getting started** or **API Setup**
2. You should see a list of phone numbers under your WABA
3. Find your phone number from Step 2.2
4. **Copy the Phone Number ID** (long numeric string below the number)

**Save this as:** `WHATSAPP_PHONE_NUMBER_ID` in your notes

### Step 4.2: Create System User and Generate Token

1. Go back to Meta Business Suite **sidebar** → **Settings** → **Users**
2. Click **Add**
3. Fill in:
   - **First name:** e.g., "API"
   - **Last name:** "User"
   - **Email:** A new email (or bot@yourdomain.com)
   - **Role:** Select **Admin** (you can restrict later)
4. Click **Add user**

Now generate a token for this user:

1. Click on the newly created user
2. Go to **User token** section
3. Click **Generate token**
4. Select:
   - **App:** Choose your app from Step 3.1
   - **Valid for:** 60 days (or longer if supported)
5. Click **Generate token**
6. **Copy the entire token immediately** — you won't see it again

**Save this as:** `WHATSAPP_API_TOKEN` in your notes (starts with `EAA...`)

---

## Phase 5: Webhook Setup

### Step 5.1: Create Verify Token (You Create This)

1. Open a terminal and generate a random string:
   ```bash
   openssl rand -hex 32
   ```
2. Copy the output (e.g., `a1b2c3d4e5f6...`)

**Save this as:** `WHATSAPP_VERIFY_TOKEN` in your notes

### Step 5.2: Get App Secret

1. In your app dashboard (from Step 3.1), go to **Settings** → **Basic**
2. Find **App Secret**
3. Click **Show** (you may need to verify your identity)
4. **Copy the App Secret**

**Save this as:** `WHATSAPP_APP_SECRET` in your notes

### Step 5.3: Set Up ngrok for Local Development

Meta requires a **public HTTPS URL** for webhooks. Since your app runs on `localhost:3000`, Meta's servers can't reach it directly. **ngrok** creates a public tunnel to your local machine.

#### Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

#### Create an ngrok account and authenticate

1. Go to [ngrok.com](https://ngrok.com) and create a free account
2. **Verify your email** — ngrok will refuse to start tunnels until your email is verified
   - Go to https://dashboard.ngrok.com/user/settings
   - If your email isn't verified, check your inbox for a verification link
3. Get your auth token from https://dashboard.ngrok.com/auth/your-authtoken
4. Authenticate the CLI:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

#### Start ngrok

```bash
ngrok http 3000
```

You'll see output like:
```
Session Status    online
Forwarding        https://droop-coexist-stinging.ngrok-free.dev -> http://localhost:3000
```

**Copy the HTTPS forwarding URL** — this is your public webhook URL.

#### Common ngrok issues

| Error | Solution |
|---|---|
| "account may not start an endpoint until the admin's email address is verified" | Verify your email at https://dashboard.ngrok.com/user/settings, then restart ngrok |
| ngrok URL changed after restart | ngrok free tier assigns a new URL every time you restart. Update the webhook URL in Meta each time. |
| "ERR_NGROK_3200" or similar | Run `ngrok config add-authtoken YOUR_AUTH_TOKEN` again |

### Step 5.4: Configure Webhook in Meta

**Important:** Configure the webhook at [developers.facebook.com](https://developers.facebook.com), NOT at business.facebook.com. These are two separate places.

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → select your app
2. In the left sidebar, click **WhatsApp** → **Configuration**
3. Under **Webhook**, click **Edit**
4. Fill in:
   - **Callback URL:** Your ngrok URL **with `/webhook` at the end**
     ```
     https://your-ngrok-id.ngrok-free.dev/webhook
     ```
     ⚠️ **Common mistake:** Forgetting `/webhook` at the end — the URL must include the path, not just the domain!
   - **Verify token:** The random string from Step 5.1 (must match `WHATSAPP_VERIFY_TOKEN` in your `.env` exactly)
5. Click **Verify and save**

**Prerequisites before clicking "Verify and save":**
- Your app must be running (`npm run dev`)
- ngrok must be running (`ngrok http 3000`)
- The verify token must match between Meta and your `.env` file

**Note:** Your server must be running and responding to `GET /webhook?hub.mode=subscribe&hub.verify_token=...` at this point.

### Step 5.5: Subscribe to Webhook Events

This step is **critical** and commonly missed. Without subscribing, Meta won't deliver messages to your webhook.

1. Still on the **WhatsApp** → **Configuration** page at developers.facebook.com
2. Scroll down to **Webhook fields**
3. Find **messages** and click **Subscribe** (it should show a green checkmark when subscribed)
4. Optionally check **message_template_status_update** for delivery reports
5. Click **Save**

**If the "messages" field is not subscribed, your app will never receive incoming WhatsApp messages, even though the webhook URL is verified.**

---

## Phase 6: WhatsApp Business Platform Setup (Deprecated but Sometimes Needed)

**Skip this section unless you get errors about "Phone Number ID not found"**

If you need the old Cloud API setup:

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Go to your app → **Whatsapp** → **Configuration**
3. Under **Accounts**, click **Add account**
4. Select your WABA from the dropdown
5. A **Phone Number ID** will appear — use this if the one from 4.1 doesn't work

---

## Phase 7: Verification & Testing

### Step 7.1: Start Everything

Make sure all three of these are running in separate terminals:

```bash
# Terminal 1: Start your app
npm run dev
# Should see: "Clinic AI Receptionist running on port 3000"

# Terminal 2: Start ngrok
ngrok http 3000
# Should see: "Forwarding https://xxxxx.ngrok-free.dev -> http://localhost:3000"
```

### Step 7.2: Verify Health Check Through ngrok

```bash
curl https://YOUR_NGROK_URL/health
```

Should respond with: `{"status":"ok","timestamp":"..."}`

If this fails, your app or ngrok isn't running.

### Step 7.3: Verify Webhook Verification Endpoint

```bash
curl "https://YOUR_NGROK_URL/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test_challenge"
```

Should respond with: `test_challenge`

If it returns 403 or an error, the verify token doesn't match your `.env`.

### Step 7.4: Test Webhook POST Manually

```bash
curl -X POST https://YOUR_NGROK_URL/webhook -H "Content-Type: application/json" -d '{"test":"message"}'
```

Check your app terminal — you should see log output like:
```
[WEBHOOK] POST received at 2026-04-16T...
[WEBHOOK] Body: {"test":"message"}
```

If you get `OK` in the curl response but see **no logs in your app terminal**, something is wrong with your app or ngrok routing.

### Step 7.5: Send a Real WhatsApp Message

1. From your personal WhatsApp, send a message to your clinic's number
2. Check your app terminal — you should see webhook logs
3. Your app should respond with a message back

### Step 7.6: If No Logs Appear When Sending a WhatsApp Message

If manual `curl` tests work (Step 7.4) but real WhatsApp messages produce no logs:

1. **Meta is not delivering the webhook.** Go to [developers.facebook.com](https://developers.facebook.com) → Your App → **WhatsApp** → **Configuration**
2. Verify:
   - The **Callback URL** exactly matches your ngrok URL + `/webhook`
   - The **messages** webhook field is **subscribed** (green checkmark)
3. If the URL is wrong, click **Edit** and re-enter it
4. If messages isn't subscribed, click **Subscribe** next to it

---

## Summary: What You Now Have

| Variable | Value | From Step |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Long numeric ID | 4.1 |
| `WHATSAPP_API_TOKEN` | `EAA...` string | 4.2 |
| `WHATSAPP_VERIFY_TOKEN` | Random hex string | 5.1 |
| `WHATSAPP_APP_SECRET` | Alphanumeric string | 5.2 |

---

## Troubleshooting

### "Phone Number ID not found"
- Ensure the phone number is verified (Step 2.2)
- Try Phase 6 to get the ID from the older developer platform

### "Invalid token"
- Make sure you copied the full token (including prefix `EAA...`)
- Tokens expire — you may need to generate a new one
- Check that the token is for the correct system user and app

### "The callback URL or verify token couldn't be validated"

This error appears when you try to save the webhook in Meta. It means Meta sent a verification request to your URL but didn't get the expected response.

**Checklist:**
1. **Is your app running?** Run `npm run dev` and verify you see the startup message
2. **Is ngrok running?** Run `ngrok http 3000` and verify you see the forwarding URL
3. **Does the callback URL include `/webhook`?** The URL must be `https://xxx.ngrok-free.dev/webhook`, not just the domain
4. **Does the verify token match exactly?** Copy-paste can add invisible spaces. Compare `WHATSAPP_VERIFY_TOKEN` in your `.env` with what you entered in Meta
5. **Test manually first:**
   ```bash
   curl "https://YOUR_NGROK_URL/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
   ```
   If this doesn't return `test`, fix the issue before trying Meta again.

### "Webhook not reachable"
- For local dev: use ngrok tunnel (`ngrok http 3000`)
- For production: ensure your domain is public and HTTPS
- Check firewall/security group rules

### "Message send fails with 'Phone number not in allowlist'"
- Common with unverified accounts
- Complete business verification (Step 2.3)
- Or test with the phone number you verified with

### "Webhook POST received but no response"
- Ensure your server is responding with HTTP 200 to webhook POST immediately
- Don't do long processing in the webhook handler — offload to async tasks

### Health check works but no logs when sending WhatsApp messages

This means Meta is NOT delivering webhooks to your URL. The most common causes:

1. **Webhook URL is wrong** — go to developers.facebook.com → Your App → WhatsApp → Configuration and verify the callback URL
2. **`messages` webhook field is not subscribed** — scroll down to "Webhook fields" and make sure `messages` has a green checkmark. If not, click **Subscribe**
3. **You're configuring in the wrong place** — configure webhooks at **developers.facebook.com**, not at business.facebook.com
4. **ngrok URL changed** — if you restarted ngrok, the URL changed. Update Meta with the new URL

**Debugging steps:**
1. Add `console.log` statements at the very top of your webhook handler in `src/app.ts`
2. Restart the app (`npm run dev`)
3. Test with manual curl:
   ```bash
   curl -X POST https://YOUR_NGROK_URL/webhook -H "Content-Type: application/json" -d '{"test":"message"}'
   ```
4. If the curl test shows logs but WhatsApp messages don't, the issue is 100% in Meta's webhook configuration (causes 1-4 above)

### ngrok: "account may not start an endpoint until the admin's email address is verified"

1. Go to https://dashboard.ngrok.com/user/settings
2. Verify your email address (check inbox for verification link)
3. After verifying, get your auth token from https://dashboard.ngrok.com/auth/your-authtoken
4. Run: `ngrok config add-authtoken YOUR_AUTH_TOKEN`
5. Restart ngrok: `ngrok http 3000`

---

## Next Steps

Once you complete all 7 phases:

1. Copy `.env.example` → `.env`
2. Fill in the 4 WhatsApp variables above
3. Proceed with Google Cloud and OpenAI setup (see `ENV_SETUP.md`)
4. Run `npm run dev`
