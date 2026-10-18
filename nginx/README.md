# Production Deployment Guide (`ceylonhosting.tech`)

This directory contains the production configurations for running CeylonHosting on your VPS.

---

## 1. Running the Next.js App on Port 4000

From your project directory:
```bash
npm install
npm run build
```

### Running with PM2
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 2. Nginx Setup

### Step 1: Copy virtual host files to Nginx
```bash
sudo cp nginx/ceylonhosting.tech.conf /etc/nginx/sites-available/
sudo cp nginx/realtime.ceylonhosting.tech.conf /etc/nginx/sites-available/
```

### Step 2: Enable both sites
```bash
sudo ln -s /etc/nginx/sites-available/ceylonhosting.tech.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/realtime.ceylonhosting.tech.conf /etc/nginx/sites-enabled/
```

### Step 3: Test and reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3. Enable Free SSL Certificates with Certbot

Once your DNS A records (`ceylonhosting.tech`, `www.ceylonhosting.tech`, and `realtime.ceylonhosting.tech`) point to your VPS IP:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ceylonhosting.tech -d www.ceylonhosting.tech -d realtime.ceylonhosting.tech
```

---

## 4. Port Mapping Summary

| Subdomain / Domain | Target Local Port | Service |
|---|---|---|
| `ceylonhosting.tech` / `www.ceylonhosting.tech` | `127.0.0.1:4000` | Next.js Storefront & API |
| `realtime.ceylonhosting.tech` | `127.0.0.1:4001` | WebSocket / Realtime Server |
