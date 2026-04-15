# Redirect URI Setup for Production

This guide explains how to set up, configure, and manage redirect URIs for your production clinic AI receptionist app.

---

## Part 1: Understanding Redirect URIs

### What is a Redirect URI?

When a user clicks "Allow" on Google's OAuth consent screen, Google needs to know where to send the user back with an authorization code. That destination is the **redirect URI**.

**Example flow:**
```
User clicks "Authorize" 
  ↓
Browser goes to Google's servers
  ↓
User sees: "App wants access to Gmail"
  ↓
User clicks "Allow"
  ↓
Google redirects browser to: https://clinic.yourdomain.com/auth/callback?code=...
  ↓
Your server receives the code
  ↓
Your server exchanges code for refresh_token (behind the scenes)
```

### How Redirect URIs Work — Google Does NOT Connect to Your Server

A common misconception is that Google's servers need to "reach" your redirect URI. **They don't.**

Here's what actually happens:

```
1. Your BROWSER sends you to Google's login page
2. You authorize on Google's page
3. Google tells your BROWSER: "redirect to http://localhost:3000/auth/callback?code=..."
4. Your BROWSER navigates to that URL (on your local machine)
5. Your local app receives the request and processes the code
```

Google's servers never connect to `localhost`. The redirect happens entirely in your browser. This is why `http://localhost:3000/auth/callback` works for local development — your browser is already on your machine.

**However, for production** there's a practical difference:
- The redirect URI needs to land on a real server that can handle the callback
- If your production server is at `https://clinic.com`, the redirect must go there (your laptop won't be running the app)
- HTTPS is required by Google for non-localhost URIs

### Production Requirements

In production, your redirect URI must meet these criteria:

| Requirement | Details |
|---|---|
| **Domain** | Real, registered domain (not localhost) |
| **HTTPS** | Must be HTTPS (not HTTP) — Google enforces this for non-localhost URIs |
| **Valid certificate** | SSL/TLS certificate must be valid (from trusted CA) |
| **Publicly reachable** | Your production server must be able to handle the callback request from the browser |
| **Exact match** | Must match exactly what you register in Google Cloud (including path, trailing slash, etc.) |

---

## Part 2: Getting a Domain

### Step 2.1: Choose a Domain Registrar

Popular options:
- **Namecheap** — budget-friendly, good support
- **GoDaddy** — largest registrar, expensive
- **Google Domains** — simple, integrates with Google Cloud
- **AWS Route 53** — if using AWS infrastructure

**Recommendation for this project:** Use **Google Domains** (easiest integration with Google Cloud and Gmail)

### Step 2.2: Register Your Domain

1. Go to your registrar's website
2. Search for your desired domain (e.g., `clinic-ai.com` or `myc linic.com`)
3. Check availability
4. Add to cart and purchase
5. Complete payment and verify email

**Cost:** $10–20/year for most domains

### Step 2.3: Verify Domain Ownership (Google Domains)

If using Google Domains:

1. Go to [Google Domains](https://domains.google.com)
2. Select your domain
3. Go to **DNS** settings
4. The DNS is already managed by Google (simple setup)

If using another registrar:

1. Go to your registrar's DNS management
2. You'll need to point the domain to your server (see Part 4)

---

## Part 3: Getting an SSL/TLS Certificate

### Why HTTPS is Required

OAuth2 requires HTTPS for security. Without a valid certificate, browsers will show "Not Secure" and Google won't allow the redirect.

### Option A: Let's Encrypt (Free, Automated) — **RECOMMENDED**

**Let's Encrypt** provides free SSL certificates valid for 90 days (auto-renew).

#### If using Certbot (most common):

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx  # For Nginx
# OR
sudo apt-get install certbot python3-certbot-apache  # For Apache

# Request a certificate (you'll need sudo/root access)
sudo certbot certonly --standalone -d clinic.yourdomain.com -d www.clinic.yourdomain.com

# Certbot will:
# 1. Ask you for an email (for renewal reminders)
# 2. Verify domain ownership by creating a temporary file
# 3. Issue the certificate
# 4. Save it to /etc/letsencrypt/live/clinic.yourdomain.com/

# Certificate files:
# - /etc/letsencrypt/live/clinic.yourdomain.com/fullchain.pem  (public cert)
# - /etc/letsencrypt/live/clinic.yourdomain.com/privkey.pem    (private key)
```

#### Auto-renewal:

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Certbot automatically creates a renewal timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal (doesn't actually renew, just checks)
sudo certbot renew --dry-run
```

#### In your Node.js app:

```typescript
import https from 'https';
import fs from 'fs';
import app from './app';

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/clinic.yourdomain.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/clinic.yourdomain.com/fullchain.pem'),
};

https.createServer(options, app).listen(443, () => {
  console.log('Server running on https://clinic.yourdomain.com');
});
```

### Option B: Paid SSL Certificate

If you prefer paid certificates (not necessary):

- **AWS Certificate Manager** — free if using AWS
- **DigiCert, Sectigo** — commercial CAs
- **Cloudflare** — free certificates if using their DNS

---

## Part 4: DNS Configuration & Deployment

### Step 4.1: Point Domain to Your Server

You need to tell the internet where your domain lives (point it to your server's IP address).

#### If your server has a static IP address (e.g., AWS, DigitalOcean):

1. Go to your domain registrar's DNS settings
2. Add an **A record**:
   - **Name:** `@` (or leave blank for root domain)
   - **Type:** `A`
   - **Value:** Your server's IP address (e.g., `203.0.113.42`)
   - **TTL:** 3600 (1 hour)
3. Click Save

This makes `clinic.yourdomain.com` resolve to your server's IP.

#### If using a subdomain:

1. Add a **CNAME record**:
   - **Name:** `api` (for `api.clinic.yourdomain.com`)
   - **Type:** `CNAME`
   - **Value:** Your main domain or server (e.g., `clinic.yourdomain.com` or `server.example.com`)
   - **TTL:** 3600

#### DNS Propagation:

After adding DNS records, wait 5 minutes to 24 hours for DNS to propagate globally.

Test with:
```bash
nslookup clinic.yourdomain.com
# or
dig clinic.yourdomain.com
```

### Step 4.2: Deploy Your App to Production

Common deployment options:

#### Railway.app (Easiest for Node.js)
1. Connect your GitHub repo
2. Railway auto-deploys on git push
3. Auto-configures HTTPS
4. Very little setup needed

#### Fly.io
1. Install flyctl CLI
2. Run `fly launch` in your project
3. Configure `fly.toml`
4. Deploy with `fly deploy`
5. Auto-HTTPS included

#### DigitalOcean / Linode / AWS EC2
1. Create a droplet/instance
2. SSH into it
3. Install Node.js
4. Clone your repo
5. Run `npm install && npm run build`
6. Use PM2 or systemd to run the app
7. Use Nginx/Apache as a reverse proxy
8. Configure SSL with Certbot

#### Docker + Any Cloud
1. Create a `Dockerfile`
2. Build and push to Docker Hub
3. Deploy to any cloud that supports Docker

**Recommendation for quick start:** Use **Railway.app** or **Fly.io** (they handle HTTPS automatically)

### Step 4.3: Test Your Domain

```bash
# Check DNS resolution
nslookup clinic.yourdomain.com

# Check HTTPS works
curl https://clinic.yourdomain.com/health

# Should respond with: {"status":"ok","timestamp":"..."}
```

---

## Part 5: Configuring Redirect URI in Google Cloud

### Step 5.1: Add Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Go to your OAuth 2.0 Client ID (from Gmail setup)
3. Click **Edit**
4. Under "Authorized redirect URIs", add:
   ```
   https://clinic.yourdomain.com/auth/callback
   ```
5. Click **Save**

**Important:** The URI must match exactly, including:
- Protocol (`https://`, not `http://`)
- Domain (`clinic.yourdomain.com`)
- Path (`/auth/callback`)
- No trailing slash (unless you want one)

### Step 5.2: Handle the Callback

Your app needs an endpoint that handles the OAuth callback:

```typescript
// src/server.ts (or wherever you set up routes)

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    res.status(400).send(`OAuth error: ${error}`);
    return;
  }

  if (!code) {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    // Exchange code for refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.google.gmail.clientId,
        client_secret: config.google.gmail.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://clinic.yourdomain.com/auth/callback',
      }),
    });

    const data = await response.json();
    const refreshToken = data.refresh_token;

    // Save this refresh_token to your .env or secrets manager
    console.log('Refresh token:', refreshToken);

    res.send('Authorization successful! You can close this window.');
  } catch (err) {
    res.status(500).send('Authorization failed');
  }
});
```

---

## Part 6: Managing Multiple Environments

### Scenario: Local Dev + Staging + Production

You likely want different redirect URIs for each environment:

| Environment | Redirect URI |
|---|---|
| Local | `http://localhost:3000/auth/callback` |
| Staging | `https://staging-api.clinic.com/auth/callback` |
| Production | `https://clinic.yourdomain.com/auth/callback` |

### Solution: Google Cloud OAuth Consent Screen

You need **multiple OAuth client IDs** (one per environment):

1. For **local dev:** Create a client ID with `http://localhost:3000/auth/callback`
2. For **staging:** Create a separate client ID with `https://staging-api.clinic.com/auth/callback`
3. For **production:** Create a separate client ID with `https://clinic.yourdomain.com/auth/callback`

### In your code:

```typescript
// src/config/index.ts

const googleGmailConfig = process.env.NODE_ENV === 'production' 
  ? {
      clientId: process.env.GMAIL_CLIENT_ID_PROD,
      clientSecret: process.env.GMAIL_CLIENT_SECRET_PROD,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN_PROD,
    }
  : process.env.NODE_ENV === 'staging'
  ? {
      clientId: process.env.GMAIL_CLIENT_ID_STAGING,
      clientSecret: process.env.GMAIL_CLIENT_SECRET_STAGING,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN_STAGING,
    }
  : {
      clientId: process.env.GMAIL_CLIENT_ID_LOCAL,
      clientSecret: process.env.GMAIL_CLIENT_SECRET_LOCAL,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN_LOCAL,
    };

export const config = {
  google: { gmail: googleGmailConfig },
  // ...
};
```

---

## Part 7: Troubleshooting

### "Invalid redirect_uri"

**Cause:** The redirect URI in your OAuth request doesn't match what's registered in Google Cloud.

**Solution:**
- Check for exact match (case-sensitive, including protocol and path)
- Remove trailing slashes if not expected
- Verify it's HTTPS (not HTTP) for non-localhost URIs
- Verify the redirect_uri in your code matches the one registered in Google Cloud Console

### "This site can't be reached — localhost refused to connect"

**Cause:** Your app isn't running when Google redirects the browser back to `localhost:3000`.

**Solution:**
1. Start your app first: `npm run dev`
2. Verify it's running: `curl http://localhost:3000/health`
3. Then try the OAuth flow again

Remember: your app must be running BEFORE you start the OAuth authorization flow, because the browser needs something to connect to when Google redirects back.

### "Cannot GET /auth/callback"

**Cause:** The `/auth/callback` route doesn't exist in your Express app.

**Solution:**
- Make sure `src/server.ts` contains the `app.get('/auth/callback', ...)` route handler
- The endpoint must exchange the authorization code for a refresh token
- Restart the app after adding the route: `npm run dev`

### "No refresh token in response"

**Cause:** Google only sends the refresh token on the first authorization. If you've authorized before, it won't send it again.

**Solution:**
1. Go to https://myaccount.google.com/connections
2. Find your app in the list
3. Click **Remove access**
4. Try the OAuth flow again — make sure `prompt=consent` is in the URL

### "Domain doesn't resolve"

**Cause:** DNS not configured or not propagated yet.

**Solution:**
```bash
# Wait up to 24 hours, then test
nslookup clinic.yourdomain.com

# If still failing, check your DNS registrar's settings
# Ensure A record points to correct IP
```

### "Certificate is self-signed" or "Certificate error"

**Cause:** SSL certificate is missing, expired, or invalid.

**Solution:**
- Check certificate exists: `sudo ls -la /etc/letsencrypt/live/clinic.yourdomain.com/`
- Renew if expired: `sudo certbot renew`
- Test certificate: `curl https://clinic.yourdomain.com/health`

### "OAuth callback timeout"

**Cause:** App not responding to callback requests (server not running or firewall blocking).

**Solution:**
- Verify app is running and listening on port 443 (or behind a reverse proxy)
- Check firewall allows HTTPS (port 443)
- Test manually: `curl https://clinic.yourdomain.com/health`

---

## Part 8: Security Best Practices

### Secrets Management

**Never hardcode secrets in code!**

Use environment variables or a secrets manager:

```bash
# .env (never commit this!)
GMAIL_CLIENT_ID_PROD=...
GMAIL_CLIENT_SECRET_PROD=...  # Keep secret!
GMAIL_REFRESH_TOKEN_PROD=...  # Keep secret!
```

For production, use:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Railway/Fly secrets management**
- **GitHub Secrets** (for CI/CD)

### HTTPS Enforcement

Always redirect HTTP → HTTPS:

```typescript
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### Certificate Renewal Monitoring

Set up alerts for certificate expiration:

```bash
# Monitor let's Encrypt renewal
sudo certbot renew --dry-run

# Add to cron job (checks daily)
0 0 * * * certbot renew --quiet
```

Or use Let's Encrypt email reminders (Certbot will send emails 20 days before expiration).

---

## Part 9: Checklist for Production Deployment

- [ ] Domain registered and DNS pointing to server
- [ ] SSL certificate installed (Let's Encrypt or paid)
- [ ] HTTPS working (`curl https://clinic.yourdomain.com/health`)
- [ ] App running on production server (PM2, systemd, or container)
- [ ] Redirect URI registered in Google Cloud Console
- [ ] `/auth/callback` endpoint implemented in your app
- [ ] Environment variables set securely (not in git)
- [ ] Certificate auto-renewal configured (if Let's Encrypt)
- [ ] Monitoring/alerting for certificate expiration
- [ ] Firewall allows ports 80 (HTTP) and 443 (HTTPS)
- [ ] Tested OAuth flow end-to-end
- [ ] All secrets rotated (not shared with anyone)

---

## Summary

**Production redirect URI format:**
```
https://clinic.yourdomain.com/auth/callback
```

**Steps:**
1. Register a domain
2. Get SSL certificate (Let's Encrypt, free)
3. Point domain to your server (DNS A record)
4. Deploy app to production server
5. Add redirect URI to Google Cloud Console
6. Implement `/auth/callback` endpoint
7. Test OAuth flow

**Easiest path:** Use Railway.app or Fly.io (they handle HTTPS, domain, and deployment for you).
