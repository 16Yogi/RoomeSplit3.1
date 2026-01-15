# RoomieSplit Deployment Guide - Nginx on Port 2211

यह guide RoomieSplit application को nginx के साथ port 2211 पर deploy करने के लिए है।

## Prerequisites

- Node.js (v18 या higher)
- npm
- nginx
- systemd (systemd service के लिए)

## Step 1: Backend Dependencies Install करें

```bash
cd /var/www/html/RoomieSplit-main/server
npm install
```

## Step 2: Frontend Dependencies Install करें

```bash
cd /var/www/html/RoomieSplit-main
npm install
```

## Step 3: Frontend Build करें

```bash
cd /var/www/html/RoomieSplit-main
npm run build
```

यह `dist/` directory में production build बनाएगा।

## Step 4: Backend Server को Systemd Service के रूप में Setup करें

### Service File Copy करें

```bash
sudo cp /var/www/html/RoomieSplit-main/server/roomiesplit-backend.service /etc/systemd/system/
```

### Service Enable और Start करें

```bash
sudo systemctl daemon-reload
sudo systemctl enable roomiesplit-backend
sudo systemctl start roomiesplit-backend
```

### Service Status Check करें

```bash
sudo systemctl status roomiesplit-backend
```

## Step 5: Nginx Configuration Setup करें

### Option A: HTTP Setup (Simple)

```bash
sudo cp /var/www/html/RoomieSplit-main/nginx-roomiesplit.conf /etc/nginx/sites-available/roomiesplit
sudo ln -s /etc/nginx/sites-available/roomiesplit /etc/nginx/sites-enabled/
```

### Option B: HTTPS Setup (Recommended for Production)

#### Step 1: SSL Certificate बनाएं

```bash
cd /var/www/html/RoomieSplit-main
sudo bash create-ssl-cert.sh
```

यह `/etc/ssl/roomiesplit/` directory में self-signed certificate बनाएगा।

**Note:** Self-signed certificate browser में warning दिखाएगा। Production के लिए proper SSL certificate (Let's Encrypt) use करें।

#### Step 2: HTTPS Config File Copy करें

```bash
sudo cp /var/www/html/RoomieSplit-main/nginx-roomiesplit-https.conf /etc/nginx/sites-available/roomiesplit
sudo ln -s /etc/nginx/sites-available/roomiesplit /etc/nginx/sites-enabled/
```

### Nginx Config Test करें

```bash
sudo nginx -t
```

### Nginx Restart करें

```bash
sudo systemctl restart nginx
```

## Step 6: Permissions Setup करें

```bash
# dist directory के permissions check करें
sudo chown -R www-data:www-data /var/www/html/RoomieSplit-main/dist

# data-template.json file के permissions
sudo chown www-data:www-data /var/www/html/RoomieSplit-main/data-template.json
sudo chmod 664 /var/www/html/RoomieSplit-main/data-template.json

# server directory के permissions
sudo chown -R www-data:www-data /var/www/html/RoomieSplit-main/server
```

## Step 7: Firewall Setup (अगर firewall enabled है)

```bash
sudo ufw allow 2211/tcp
```

## Access करें

### HTTP Setup के लिए:
Application `http://your-server-ip:2211` या `http://your-domain:2211` पर available होगा।

### HTTPS Setup के लिए:
Application `https://your-server-ip:2211` या `https://your-domain:2211` पर available होगा।

**Note:** Self-signed certificate use करने पर browser में security warning दिखेगा। "Advanced" → "Proceed to site" click करें।

## Useful Commands

### Backend Service Commands

```bash
# Service status check
sudo systemctl status roomiesplit-backend

# Service restart
sudo systemctl restart roomiesplit-backend

# Service logs देखें
sudo journalctl -u roomiesplit-backend -f

# Service stop
sudo systemctl stop roomiesplit-backend

# Service start
sudo systemctl start roomiesplit-backend
```

### Nginx Commands

```bash
# Nginx status
sudo systemctl status nginx

# Nginx restart
sudo systemctl restart nginx

# Nginx reload (config changes के बाद)
sudo systemctl reload nginx

# Nginx logs
sudo tail -f /var/log/nginx/roomiesplit-access.log
sudo tail -f /var/log/nginx/roomiesplit-error.log
```

## Troubleshooting

### Backend Server Start नहीं हो रहा

1. Check logs:
   ```bash
   sudo journalctl -u roomiesplit-backend -n 50
   ```

2. Check Node.js path:
   ```bash
   which node
   ```
   अगर path different है, तो service file में `ExecStart` path update करें।

3. Check permissions:
   ```bash
   sudo chown -R www-data:www-data /var/www/html/RoomieSplit-main/server
   ```

### Nginx 502 Bad Gateway Error

1. Backend server check करें:
   ```bash
   sudo systemctl status roomiesplit-backend
   ```

2. Backend server port check करें:
   ```bash
   sudo netstat -tlnp | grep 3001
   ```

3. Backend logs check करें:
   ```bash
   sudo journalctl -u roomiesplit-backend -f
   ```

### Frontend Load नहीं हो रहा

1. Build check करें:
   ```bash
   ls -la /var/www/html/RoomieSplit-main/dist
   ```

2. Nginx error logs check करें:
   ```bash
   sudo tail -f /var/log/nginx/roomiesplit-error.log
   ```

3. Permissions check करें:
   ```bash
   sudo chown -R www-data:www-data /var/www/html/RoomieSplit-main/dist
   ```

## Updates के लिए

### Frontend Update करने के लिए:

```bash
cd /var/www/html/RoomieSplit-main
git pull  # अगर git use कर रहे हैं
npm install
npm run build
sudo systemctl reload nginx
```

### Backend Update करने के लिए:

```bash
cd /var/www/html/RoomieSplit-main/server
git pull  # अगर git use कर रहे हैं
npm install
sudo systemctl restart roomiesplit-backend
```

## Notes

- Backend server port 3001 पर run होता है (internal use के लिए)
- Frontend nginx के through port 2211 पर serve होता है
- API requests `/api` path के through proxy होती हैं
- Data file location: `/var/www/html/RoomieSplit-main/data-template.json`

