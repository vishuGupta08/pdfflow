# PDFFlow Deployment Guide

Since you're experiencing `npm ci` issues with Railway, here are **multiple deployment options**:

## Option 1: Railway (Updated Configuration)

I've created fixes for the Railway deployment issues:

### What I Fixed:
- ✅ Created `deploy.sh` script to bypass `npm ci` issues
- ✅ Updated `railway.toml` and `nixpacks.toml` configurations
- ✅ Added proper package-lock.json files
- ✅ Fixed workspace structure handling

### Deploy Steps:
1. **Push changes to GitHub:**
   ```bash
   git push origin main
   ```

2. **In Railway Dashboard:**
   - Go to your project
   - Click "Redeploy"
   - Monitor the build logs

3. **If it still fails,** try Option 2 below.

## Option 2: Render.com (Recommended Alternative)

Render.com is more reliable for Node.js deployments and handles complex projects better.

### Deploy on Render:
1. **Go to** [render.com](https://render.com)
2. **Connect GitHub** and select your repository
3. **Create a Web Service** with these settings:
   - **Name:** `pdfflow-backend`
   - **Environment:** `Node`
   - **Build Command:** `cd server && npm install && npm run build`
   - **Start Command:** `cd server && npm start`
   - **Plan:** Free

4. **Add Environment Variables:**
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: (add after frontend deployment)

## Option 3: Heroku (Classic Option)

### Deploy on Heroku:
1. **Create a Procfile:**
   ```
   web: cd server && npm start
   ```

2. **Deploy:**
   ```bash
   # Install Heroku CLI first
   heroku create pdfflow-backend
   heroku config:set NODE_ENV=production
   git push heroku main
   ```

## Frontend Deployment (Vercel)

Regardless of which backend option you choose:

1. **Go to** [vercel.com](https://vercel.com)
2. **Import your GitHub repository**
3. **Settings:**
   - Framework: `Vite`
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variables:**
   - `VITE_API_BASE_URL`: `https://your-backend-url.com/api`

## Troubleshooting

### If Railway keeps failing:
- The `npm ci` error usually indicates workspace/dependency conflicts
- Our fixes should resolve this, but Render.com is more reliable

### If Render.com deployment fails:
- Check build logs for specific errors
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

## Recommendation

**For best results, use Render.com for the backend** - it's more reliable than Railway for complex Node.js projects and has better free tier support.

---

**Which option would you like to try?**

## Prerequisites

1. GitHub account
2. Vercel account (free)
3. Railway account (free)

## Step 1: Prepare Your Code

### Push to GitHub
1. Create a new repository on GitHub
2. Push your PDFFlow code to the repository:

```bash
git init
git add .
git commit -m "Initial commit - PDFFlow application"
git branch -M main
git remote add origin https://github.com/yourusername/pdfflow.git
git push -u origin main
```

## Step 2: Deploy the Backend (Railway)

### 2.1 Create Railway Project
1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your PDFFlow repository

### 2.2 Configure Railway
1. Railway will auto-detect your Node.js backend
2. Set the following environment variables in Railway:
   - `NODE_ENV`: `production`
   - `PORT`: (Railway will auto-set this)
   - `FRONTEND_URL`: (We'll update this after frontend deployment)

### 2.3 Build Settings
Railway should automatically detect the build configuration from `railway.toml`. If not:
- Build Command: `cd server && npm install && npm run build`
- Start Command: `cd server && npm start`

### 2.4 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Note your Railway backend URL (e.g., `https://your-app.railway.app`)

## Step 3: Deploy the Frontend (Vercel)

### 3.1 Create Vercel Project
1. Go to [Vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository

### 3.2 Configure Build Settings
1. Framework Preset: `Vite`
2. Root Directory: `client`
3. Build Command: `npm run build`
4. Output Directory: `dist`

### 3.3 Environment Variables
Add the following environment variable in Vercel:
- `VITE_API_BASE_URL`: `https://your-railway-app.railway.app/api`

### 3.4 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Note your Vercel frontend URL (e.g., `https://pdfflow.vercel.app`)

## Step 4: Update Backend CORS

### 4.1 Update Railway Environment
Go back to Railway and update the environment variable:
- `FRONTEND_URL`: `https://your-vercel-app.vercel.app`

### 4.2 Redeploy Backend
Railway will automatically redeploy with the new environment variable.

## Step 5: Test Your Deployment

1. Visit your Vercel frontend URL
2. Try uploading a PDF
3. Apply some transformations
4. Test the preview and download functionality

## Configuration Files Created

### `/vercel.json` - Vercel Configuration
```json
{
  "name": "pdfflow-frontend",
  "version": 2,
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "framework": "vite"
}
```

### `/railway.toml` - Railway Configuration
```toml
[build]
builder = "nixpacks"
buildCommand = "cd server && npm install && npm run build"

[deploy]
startCommand = "cd server && npm start"
healthcheckPath = "/health"
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. **Build Failures**: Check that all dependencies are in `package.json`
3. **File Upload Issues**: Railway has file system limitations; consider using cloud storage for production

### Environment Variables Checklist

**Railway (Backend):**
- ✅ `NODE_ENV=production`
- ✅ `FRONTEND_URL=https://your-vercel-app.vercel.app`

**Vercel (Frontend):**
- ✅ `VITE_API_BASE_URL=https://your-railway-app.railway.app/api`

## Free Tier Limits

### Railway
- 500 hours/month
- 1 GB RAM
- 1 GB storage
- Shared CPU

### Vercel
- 100 GB bandwidth/month
- 1000 deployments/month
- Serverless functions

## Next Steps

1. Set up custom domain (optional)
2. Configure monitoring and logging
3. Set up CI/CD pipeline
4. Consider upgrading to paid plans for production use

## Support

If you encounter any issues:
1. Check the deployment logs in Railway/Vercel dashboards
2. Verify environment variables are set correctly
3. Test API endpoints directly using the backend URL

Your PDFFlow application should now be live and accessible worldwide! 🎉 