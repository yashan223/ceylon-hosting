# Production Deployment Guide (`ceylonhosting.tech`)

This directory contains the production configurations for running CeylonHosting on your VPS.

---

## 1. Running the Next.js App on Port 4000

From your project directory:
```bash
npm install
npm run build:low-mem
```

### Running with PM2
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 2. Obtain SSL Certificates with Certbot

Ensure your DNS A records (`ceylonhosting.tech`, `www.ceylonhosting.tech`, and `realtime.ceylonhosting.tech`) point to your VPS IP:

```bash
sudo apt update && sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d ceylonhosting.tech -d www.ceylonhosting.tech -d realtime.ceylonhosting.tech
```

> **Note**: Certbot saves your unified SSL bundle under `/etc/letsencrypt/live/ceylonhosting.tech/fullchain.pem` and `privkey.pem`.

---

## 3. Nginx Setup

### Step 1: Copy virtual host files to Nginx
```bash
sudo cp nginx/ceylonhosting.tech.conf /etc/nginx/sites-available/
sudo cp nginx/realtime.ceylonhosting.tech.conf /etc/nginx/sites-available/
```

### Step 2: Enable both sites
```bash
sudo ln -sf /etc/nginx/sites-available/ceylonhosting.tech.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/realtime.ceylonhosting.tech.conf /etc/nginx/sites-enabled/
```

### Step 3: Test and reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Verify SSL auto-renewal
```bash
sudo certbot renew --dry-run
```

---

## 4. Configuration Highlights

- **HTTP to HTTPS 301 Redirect**: Port 80 automatically redirects all traffic to HTTPS, retaining `/.well-known/acme-challenge/` for Certbot renewal.
- **Large File & Mod Storage**: Configured with `client_max_body_size 500M`, `client_body_timeout 600s`, and `proxy_request_buffering off` for unbuffered streaming uploads and downloads.
- **Extended Timeouts**: Proxy timeouts set to 600s to support large file transfers without 504 Gateway Timeouts.
- **WebSocket Upgrade Support**: Seamless connection upgrades for Next.js and real-time clients.
- **Static Asset Caching**: 1-year immutable caching for `/_next/static/` build assets and media caching for public assets.
- **Hardened Security**: Includes HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and modern TLS ciphers.

---

## 5. Port Mapping Summary

| Subdomain / Domain | Target Local Port | Service |
|---|---|---|
| `ceylonhosting.tech` / `www.ceylonhosting.tech` | `127.0.0.1:4000` | Next.js Storefront, File Storage & API |
| `realtime.ceylonhosting.tech` | `127.0.0.1:4001` | WebSocket / Realtime Server |
