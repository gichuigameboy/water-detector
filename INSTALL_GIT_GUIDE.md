# Install Git and Deploy to Netlify - Complete Guide

## 🚀 **Step 1: Install Git on Windows**

### **Option A: Download Git (Recommended)**
1. Go to [git-scm.com/download/win](https://git-scm.com/download/win)
2. Download "64-bit Git for Windows Setup"
3. Run the installer with these settings:
   - **Next** → **Next** → **Next**
   - **Editor:** Use Visual Studio Code as default editor
   - **Line ending conversion:** Checkout Windows-style, commit Unix-style
   - **Terminal:** Use MinTTY
   - **Extra options:** Enable file system caching
   - **Install**

### **Option B: Install via Command Line**
```bash
# Download Git installer
curl -L -o git-installer.exe https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe

# Run installer silently
git-installer.exe /VERYSILENT /NORESTART
```

### **Verify Git Installation**
```bash
git --version
# Should show: git version 2.x.x
```

## 🔧 **Step 2: Configure Git**

### **Set Up Your Identity**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### **Set Up SSH Key (Recommended)**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Start SSH agent
eval $(ssh-agent -s)

# Add SSH key
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub
# Copy this key for GitHub setup
```

## 📁 **Step 3: Initialize Your Project**

### **Navigate to Project Directory**
```bash
cd c:/Users/Patrick/arduino-dashboard
```

### **Initialize Git Repository**
```bash
git init
git add .
git commit -m "Initial commit: Arduino dashboard with Supabase integration"
```

### **Create .gitignore**
Create a `.gitignore` file to exclude sensitive files:
```
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/

# Dependencies
node_modules/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test
```

### **Add and Commit**
```bash
git add .gitignore
git commit -m "Add .gitignore file"
```

## 🌐 **Step 4: Create GitHub Repository**

### **Create Repository on GitHub**
1. Go to [github.com](https://github.com)
2. Sign in or create account
3. Click "+" → "New repository"
4. Repository name: `arduino-soil-dashboard`
5. Description: "Arduino soil monitoring dashboard with Supabase"
6. **Keep it Public** (for free hosting)
7. **Don't initialize with README** (we have one)
8. Click "Create repository"

### **Connect Local Repository to GitHub**
```bash
# Add remote origin
git remote add origin https://github.com/yourusername/arduino-soil-dashboard.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🔐 **Step 5: Set Up SSH (Optional but Recommended)**

### **Add SSH Key to GitHub**
1. Copy your SSH public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

2. Go to GitHub → Settings → SSH and GPG keys
3. Click "New SSH key"
4. Paste your public key
5. Save

### **Test SSH Connection**
```bash
ssh -T git@github.com
# Should show: "Hi username! You've successfully authenticated"
```

## 🚀 **Step 6: Deploy to Netlify**

### **Option A: Git Integration (Recommended)**
1. Go to [app.netlify.com](https://app.netlify.com)
2. Sign up or log in
3. Click "New site from Git"
4. Choose GitHub
5. Select your repository: `arduino-soil-dashboard`
6. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
7. Click "Deploy site"

### **Option B: Manual Upload**
1. Build your project:
```bash
npm run build
```

2. Go to [app.netlify.com](https://app.netlify.com)
3. Click "Add new site" → "Deploy manually"
4. Drag the `dist` folder to the upload area
5. Click "Deploy"

## 🔧 **Step 7: Configure Environment Variables**

### **In Netlify Dashboard:**
1. Go to your site settings
2. Click "Build & deploy" → "Environment"
3. Add these variables:
   - `VITE_SUPABASE_URL` = your_supabase_project_url
   - `VITE_SUPABASE_ANON_KEY` = your_supabase_anon_key

### **Trigger Rebuild:**
1. Go to "Deploys" tab
2. Click "Trigger deploy" → "Clear cache and deploy site"

## 🎯 **Step 8: Verify Deployment**

### **Check Your Live Site:**
- Netlify will provide a URL like: `https://your-random-name-123456.netlify.app`
- Visit the URL to see your live dashboard

### **Test Functionality:**
- ✅ Sign up for an account
- ✅ Sign in
- ✅ Check if charts load (data will appear once desktop utility is running)
- ✅ Test profile page

## 🔄 **Step 9: Set Up Continuous Deployment**

### **Automatic Updates:**
Now when you make changes:
1. Make your changes locally
2. Commit and push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

3. Netlify automatically deploys your changes!

## 🛠️ **Troubleshooting:**

### **Git Not Recognized After Install:**
- Restart your command prompt/terminal
- Or restart your computer
- Verify installation: `git --version`

### **Permission Denied (publickey):**
- Ensure SSH key is added to GitHub
- Test SSH: `ssh -T git@github.com`
- Use HTTPS instead: `git remote set-url origin https://github.com/user/repo.git`

### **Build Failures on Netlify:**
- Check Netlify build logs
- Ensure all dependencies in `package.json`
- Verify environment variables are set

### **Supabase Connection Issues:**
- Double-check environment variables
- Ensure Supabase project is active
- Check Row Level Security settings

## 📱 **Your Complete Workflow:**

### **Development:**
1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to GitHub
4. Netlify auto-deploys

### **Production:**
1. Users access: `https://your-site.netlify.app`
2. Desktop utility connects to Arduino locally
3. Data syncs to Supabase
4. Web dashboard shows real-time data

## 🎉 **Success!**

You now have:
- ✅ **Git installed and configured**
- ✅ **GitHub repository with your project**
- ✅ **Netlify deployment with auto-updates**
- ✅ **Live dashboard accessible worldwide**
- ✅ **Complete development workflow**

Your Arduino dashboard is now live on the internet and ready for users to monitor their soil sensors from anywhere!