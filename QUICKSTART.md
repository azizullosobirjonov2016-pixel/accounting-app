# 🚀 Server Setup - Quick Start Guide

## 5-Minute Server Installation

### Step 1: Check Prerequisites
```bash
# Check if Node.js is installed
node --version
npm --version
```

**If not installed:**
- Download from https://nodejs.org/ (LTS version recommended)
- Install and restart your terminal

### Step 2: Navigate to Project
```bash
cd "path/to/accounting-app"
```

### Step 3: Install Dependencies
```bash
npm install
```
*This will download ~50MB of packages*

### Step 4: Create .env File
Copy `.env.example` to `.env`:
```bash
copy .env.example .env  # Windows
cp .env.example .env     # Mac/Linux
```

### Step 5: Start Server
```bash
npm start
```

**Output should show:**
```
📊 Accounting Server running on http://localhost:5000
```

### Step 6: Access Application
- **Frontend:** http://localhost:5000
- **Test Login:**
  - Username: `admin`
  - Password: `pass`
  - Role: `Administrator`

---

## 🔄 Development Mode

For development with auto-restart:
```bash
npm run dev
```

This watches for file changes and automatically restarts server.

---

## 📊 What's in the Database

After first run, `accounting.db` is created with:
- ✅ Empty products table
- ✅ Empty transactions table  
- ✅ 3 test users (user, manager, admin)
- ✅ All required schema

---

## 🔒 Important for Production

Update `.env` file:
```
PORT=5000
JWT_SECRET=change-this-to-random-string
NODE_ENV=production
```

Generate strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🐛 Common Issues

### Port 5000 already in use
Change port in `.env`:
```
PORT=3000
```
Then restart server.

### npm: command not found
Node.js not installed correctly. Restart terminal after installing.

### Module not found errors
Run: `npm install` again

### Database locked
Stop server (Ctrl+C), delete `accounting.db`, restart

---

## 📱 Access from Other Computers

1. Get your IP address:
   ```bash
   ipconfig           # Windows
   ifconfig           # Mac/Linux
   ```

2. Use `http://YOUR_IP:5000` from other machines

3. Make sure firewall allows port 5000

---

## 📤 Deploy to Cloud

See [SERVER_README.md](SERVER_README.md) for:
- Docker deployment
- Heroku setup
- DigitalOcean
- AWS/Azure

---

## ✅ Verification Checklist

- [ ] Node.js installed (`node --version` shows v14+)
- [ ] npm installed (`npm --version` shows v6+)
- [ ] Dependencies installed (`node_modules` folder exists)
- [ ] .env file created
- [ ] Server starts without errors
- [ ] Browser loads on http://localhost:5000
- [ ] Login works with admin/pass
- [ ] Can add test client
- [ ] Data persists (check accounting.db exists)

---

## 📞 Still Having Issues?

1. Check browser console (F12) for errors
2. Check server terminal for error messages
3. See [SERVER_README.md](SERVER_README.md) Troubleshooting section
4. Verify no other service using port 5000

---

**That's it! You now have a multi-user accounting system!** 🎉
