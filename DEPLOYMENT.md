# Production Deployment

Guide for deploying the clinic AI receptionist to production.

---

## 1. Get a Domain

Register a domain from any registrar (Namecheap, Google Domains, AWS Route 53). Cost: ~$10–20/year.

---

## 2. Deploy the App

### Easiest: Railway.app or Fly.io

Both handle HTTPS automatically — no SSL setup needed.

**Railway:**
1. Connect GitHub repo
2. Set environment variables in Railway dashboard
3. Deploy — auto-builds and runs on push

**Fly.io:**
```bash
fly launch
fly deploy
```

### Manual: VPS (DigitalOcean, Linode, AWS EC2)

1. Create a server, SSH in, install Node.js
2. Clone repo, `npm install && npm run build`
3. Run with PM2: `pm2 start dist/server.js`
4. Set up Nginx as reverse proxy
5. Get SSL certificate:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d clinic.yourdomain.com
   ```
6. Certificates auto-renew. Test: `sudo certbot renew --dry-run`

---

## 3. DNS Setup

Point your domain to your server:

1. In your registrar's DNS settings, add an **A record**:
   - Name: `@`
   - Value: your server's IP address
   - TTL: 3600
2. Wait for DNS propagation (5 min to 24 hours)
3. Test: `nslookup clinic.yourdomain.com`

---

## 4. Update Webhook URL

In [developers.facebook.com](https://developers.facebook.com) → your app → WhatsApp → Configuration:
- Change callback URL to: `https://clinic.yourdomain.com/webhook`
- Verify token stays the same

---

## 5. Production Gmail Redirect URI

1. Google Cloud Console → Credentials → your OAuth client → **Edit**
2. Add: `https://clinic.yourdomain.com/auth/callback`
3. Run the OAuth flow once from production to get a new refresh token

For multiple environments, create separate OAuth client IDs:

| Environment | Redirect URI |
|---|---|
| Local | `http://localhost:3000/auth/callback` |
| Production | `https://clinic.yourdomain.com/auth/callback` |

---

## 6. Security Checklist

- [ ] `.env` not committed to git (add to `.gitignore`)
- [ ] All secrets in environment variables (not hardcoded)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] WhatsApp webhook signature verification enabled (`WHATSAPP_APP_SECRET`)
- [ ] Firewall allows only ports 80 and 443
- [ ] SSL certificate auto-renewal configured
- [ ] Debug logging disabled in `src/app.ts`
- [ ] API tokens rotated periodically
- [ ] Service account has minimum required permissions

---

## 7. Troubleshooting

### "Invalid redirect_uri"
The URI in your OAuth request doesn't match Google Cloud Console exactly. Check protocol, domain, path, and trailing slash.

### "Domain doesn't resolve"
DNS not propagated yet. Wait up to 24 hours, then check: `nslookup clinic.yourdomain.com`

### "Certificate error"
Renew: `sudo certbot renew`. Check: `curl https://clinic.yourdomain.com/health`

### "OAuth callback timeout"
App not running or firewall blocking port 443. Test: `curl https://clinic.yourdomain.com/health`
