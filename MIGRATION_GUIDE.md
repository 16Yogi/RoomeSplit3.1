# RoomieSplit Migration/Setup Guide
## नए Linux Machine पर Setup करने के लिए File Structure

यह guide आपको बताता है कि RoomieSplit application को किसी नए Linux machine पर deploy करने के लिए कौन सी files कहाँ रखनी हैं।

---

## 📁 File Structure Overview

```
/var/www/html/RoomieSplit-main/
├── Frontend Files (React Application)
│   ├── components/          # React components
│   ├── contexts/            # React contexts (currently empty after auth removal)
│   ├── utils/               # Utility functions
│   ├── dist/                # Production build (npm run build के बाद generate होता है)
│   ├── node_modules/        # Frontend dependencies (npm install के बाद)
│   ├── App.tsx              # Main application component
│   ├── index.tsx            # Entry point
│   ├── index.html           # HTML template
│   ├── types.ts             # TypeScript type definitions
│   ├── package.json         # Frontend dependencies
│   ├── package-lock.json    # Frontend lock file
│   ├── tsconfig.json        # TypeScript configuration
│   ├── vite.config.ts       # Vite build configuration
│   └── data-template.json   # Data storage file (backend द्वारा use होता है)
│
├── Backend Files (Node.js Server)
│   └── server/
│       ├── index.js         # Backend server code
│       ├── package.json     # Backend dependencies
│       ├── package-lock.json # Backend lock file
│       └── node_modules/    # Backend dependencies (npm install के बाद)
│
└── Configuration Files
    ├── nginx-roomiesplit.conf           # HTTP nginx configuration
    ├── nginx-roomiesplit-https.conf     # HTTPS nginx configuration
    ├── create-ssl-cert.sh               # SSL certificate generation script
    └── server/roomiesplit-backend.service # Systemd service file
```

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Files Copy करें

नई machine पर सभी files copy करें:

```bash
# Source machine से
cd /var/www/html
tar -czf roomiesplit-backup.tar.gz RoomieSplit-main/

# नई machine पर
scp roomiesplit-backup.tar.gz user@new-machine:/tmp/
ssh user@new-machine
cd /var/www/html
tar -xzf /tmp/roomiesplit-backup.tar.gz
```

**या Git के through:**

```bash
# अगर Git repository है
git clone <repository-url> /var/www/html/RoomieSplit-main
cd /var/www/html/RoomieSplit-main
```

---

### Step 2: Prerequisites Install करें

```bash
# Node.js install करें (v18 या higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# nginx install करें
sudo apt-get update
sudo apt-get install -y nginx

# Verify installations
node --version
npm --version
nginx -v
```

---

### Step 3: Backend Setup

```bash
cd /var/www/html/RoomieSplit-main/server

# Dependencies install करें
npm install

# Verify करें
ls -la node_modules/
```

**Important Files:**
- `server/index.js` - Backend server code (must be present)
- `server/package.json` - Backend dependencies list
- `../data-template.json` - Data storage file (parent directory में)

---

### Step 4: Frontend Setup

```bash
cd /var/www/html/RoomieSplit-main

# Dependencies install करें
npm install

# Production build करें
npm run build

# Verify करें
ls -la dist/
```

**Important Files:**
- `package.json` - Frontend dependencies
- `vite.config.ts` - Build configuration
- `dist/` - Production build directory (build के बाद create होगा)

---

### Step 5: Systemd Service Setup

```bash
# Service file copy करें
sudo cp /var/www/html/RoomieSplit-main/server/roomiesplit-backend.service /etc/systemd/system/

# Service enable और start करें
sudo systemctl daemon-reload
sudo systemctl enable roomiesplit-backend
sudo systemctl start roomiesplit-backend

# Status check करें
sudo systemctl status roomiesplit-backend
```

**Service File Location:**
- `/etc/systemd/system/roomiesplit-backend.service`

---

### Step 6: Nginx Configuration

#### Option A: HTTP Setup (Simple)

```bash
# HTTP config copy करें
sudo cp /var/www/html/RoomieSplit-main/nginx-roomiesplit.conf /etc/nginx/sites-available/roomiesplit

# Site enable करें
sudo ln -s /etc/nginx/sites-available/roomiesplit /etc/nginx/sites-enabled/

# Config test करें
sudo nginx -t

# Nginx restart करें
sudo systemctl restart nginx
```

#### Option B: HTTPS Setup

```bash
# SSL certificate बनाएं
cd /var/www/html/RoomieSplit-main
sudo bash create-ssl-cert.sh

# HTTPS config copy करें
sudo cp /var/www/html/RoomieSplit-main/nginx-roomiesplit-https.conf /etc/nginx/sites-available/roomiesplit

# Site enable करें
sudo ln -s /etc/nginx/sites-available/roomiesplit /etc/nginx/sites-enabled/

# Config test करें
sudo nginx -t

# Nginx restart करें
sudo systemctl restart nginx
```

**Nginx Config Files Location:**
- `/etc/nginx/sites-available/roomiesplit` - Config file
- `/etc/nginx/sites-enabled/roomiesplit` - Symlink

---

### Step 7: Permissions Setup

```bash
# Frontend dist directory permissions
sudo chown -R www-data:www-data /var/www/html/RoomieSplit-main/dist

# Backend server directory permissions
sudo chown -R www-data:www-data /var/www/html/RoomieSplit-main/server

# Data file permissions
sudo chown www-data:www-data /var/www/html/RoomieSplit-main/data-template.json
sudo chmod 664 /var/www/html/RoomieSplit-main/data-template.json

# SSL certificate permissions (अगर HTTPS use कर रहे हैं)
sudo chmod 600 /etc/ssl/roomiesplit/roomiesplit.key
sudo chmod 644 /etc/ssl/roomiesplit/roomiesplit.crt
```

---

### Step 8: Firewall Setup

```bash
# Port 2211 allow करें
sudo ufw allow 2211/tcp

# Status check करें
sudo ufw status
```

---

## 📋 Essential Files Checklist

### ✅ Must Have Files:

#### Application Code:
- ✅ `/var/www/html/RoomieSplit-main/App.tsx`
- ✅ `/var/www/html/RoomieSplit-main/index.tsx`
- ✅ `/var/www/html/RoomieSplit-main/types.ts`
- ✅ `/var/www/html/RoomieSplit-main/package.json`
- ✅ `/var/www/html/RoomieSplit-main/vite.config.ts`
- ✅ `/var/www/html/RoomieSplit-main/components/` (directory)
- ✅ `/var/www/html/RoomieSplit-main/utils/` (directory)
- ✅ `/var/www/html/RoomieSplit-main/server/index.js`
- ✅ `/var/www/html/RoomieSplit-main/server/package.json`
- ✅ `/var/www/html/RoomieSplit-main/data-template.json`

#### Configuration Files:
- ✅ `/var/www/html/RoomieSplit-main/nginx-roomiesplit.conf` (HTTP)
- ✅ `/var/www/html/RoomieSplit-main/nginx-roomiesplit-https.conf` (HTTPS - optional)
- ✅ `/var/www/html/RoomieSplit-main/create-ssl-cert.sh` (HTTPS के लिए - optional)
- ✅ `/var/www/html/RoomieSplit-main/server/roomiesplit-backend.service`

#### Generated Files (Installation के बाद):
- ⚠️ `/var/www/html/RoomieSplit-main/node_modules/` (npm install के बाद)
- ⚠️ `/var/www/html/RoomieSplit-main/server/node_modules/` (npm install के बाद)
- ⚠️ `/var/www/html/RoomieSplit-main/dist/` (npm run build के बाद)
- ⚠️ `/etc/systemd/system/roomiesplit-backend.service` (setup के बाद copy)
- ⚠️ `/etc/nginx/sites-available/roomiesplit` (setup के बाद copy)
- ⚠️ `/etc/ssl/roomiesplit/` (HTTPS setup के बाद - optional)

### ❌ Files NOT Needed (Optional/Documentation):
- Documentation files (README.md, DEPLOYMENT.md, etc.) - helpful but not required
- `.git/` directory - अगर Git use नहीं कर रहे
- `node_modules/` - नई machine पर `npm install` करना होगा
- `dist/` - नई machine पर `npm run build` करना होगा

---

## 🔄 Migration Checklist

नई machine पर setup करते समय यह checklist follow करें:

- [ ] Application files copy करें
- [ ] Node.js install करें (v18+)
- [ ] nginx install करें
- [ ] Backend dependencies install करें (`cd server && npm install`)
- [ ] Frontend dependencies install करें (`npm install`)
- [ ] Frontend build करें (`npm run build`)
- [ ] Systemd service file copy और setup करें
- [ ] Nginx config copy और setup करें
- [ ] SSL certificate बनाएं (अगर HTTPS use कर रहे हैं)
- [ ] Permissions setup करें
- [ ] Firewall rules add करें
- [ ] Backend service start करें
- [ ] Nginx restart करें
- [ ] Test करें (http://your-ip:2211)

---

## 📝 Important Notes

1. **node_modules को copy न करें**: हमेशा नई machine पर `npm install` करें
2. **dist directory को copy न करें**: हमेशा नई machine पर `npm run build` करें
3. **data-template.json**: यह file data store करती है - अगर existing data है तो backup लें
4. **Environment Variables**: अगर `.env` file use कर रहे हैं, तो वह भी copy करें
5. **Ports**: 
   - Frontend: Port 2211 (nginx)
   - Backend: Port 3001 (internal use)
6. **Service User**: Backend service `www-data` user के तहत run होता है
7. **Data Location**: Data file location: `/var/www/html/RoomieSplit-main/data-template.json`

---

## 🐛 Troubleshooting

### Backend Service Start नहीं हो रहा:
```bash
# Logs check करें
sudo journalctl -u roomiesplit-backend -n 50

# Dependencies check करें
cd /var/www/html/RoomieSplit-main/server
ls -la node_modules/
```

### Frontend Load नहीं हो रहा:
```bash
# Build check करें
ls -la /var/www/html/RoomieSplit-main/dist/

# Nginx logs check करें
sudo tail -f /var/log/nginx/roomiesplit-error.log
```

### 502 Bad Gateway Error:
```bash
# Backend service check करें
sudo systemctl status roomiesplit-backend

# Port check करें
sudo ss -tlnp | grep 3001
```

---

## 📞 Support

अगर कोई issue है, तो check करें:
- Backend logs: `sudo journalctl -u roomiesplit-backend -f`
- Nginx logs: `sudo tail -f /var/log/nginx/roomiesplit-error.log`
- Service status: `sudo systemctl status roomiesplit-backend`
- Port status: `sudo ss -tlnp | grep -E "(2211|3001)"`

---

**Last Updated**: January 2026

