# Child Vaccination System - Deployment Guide

## Overview
This guide covers deploying the Child Vaccination System backend to **Render** and the frontend to **Netlify**.

---

## Backend Deployment (Node.js + Express on Render)

### Prerequisites
- MongoDB Atlas account with cluster created
- Render.com account
- GitHub repository with code pushed

### Step 1: Prepare Environment Variables

**Create/Update `.env` file with production values:**

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/?appName=child-vacc-system
MONGO_DB_NAME=child-vaccination-system

# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend URLs (CORS whitelist)
FRONTEND_URL=http://localhost:3000
PRODUCTION_URL=https://your-frontend-domain.netlify.app

# JWT Configuration
JWT_SECRET=generate-a-secure-random-string-at-least-32-characters

# Email Service Configuration (Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=your-gmail@gmail.com

# Firebase (Optional - for notifications)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_PRIVATE_KEY=your_private_key_json
```

**⚠️ DO NOT commit `.env` file to GitHub**

### Step 2: Deploy Backend on Render

1. **Sign in to Render.com** → Dashboard → New → Web Service
2. **Connect GitHub Repository**
   - Select "Connect your own"
   - Authorize GitHub and select your repository
3. **Configure Service**
   - Name: `child-vaccination-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Set Environment Variables**
   - Copy all values from your `.env` file
   - Paste them into Render's Environment section
   - Key values:
     - `MONGODB_URI`: Your Atlas connection string
     - `NODE_ENV`: production
     - `JWT_SECRET`: Strong random string
     - `EMAIL_USER`, `EMAIL_PASS`: Gmail credentials
     - `PRODUCTION_URL`: Your Netlify frontend URL
5. **Choose Plan** → Free tier available (recommended for testing)
6. **Deploy** → Wait 2-3 minutes for build and startup

**Note:** Free tier on Render will spin down after 15 minutes of inactivity (cold start ~30 sec on next request).

### Step 3: Verify Backend Deployment

```bash
# Check health endpoint
curl https://your-render-backend.onrender.com/api/health
# Should return: {"status":"OK","message":"Child Vaccination System is running"}
```

---

## Frontend Deployment (Static Site on Netlify)

### Prerequisites
- Netlify.com account
- GitHub repository with code pushed
- Backend URL from Render deployment

### Step 1: Configure Frontend for Production

**The frontend is a static HTML/CSS/JS site.** No build step is needed, but you need to configure the API URL.

**Update `frontend/js/config.js`:**
```javascript
// Deployment automatically sets window.API_BASE_URL based on environment
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000/api';
```

**All HTML pages load this config before utils.js**, so the API URL is centralized and configurable.

### Step 2: Deploy Frontend on Netlify

1. **Sign in to Netlify** → New site from Git
2. **Connect GitHub**
   - Select your repository
   - Authorize and connect
3. **Configure Build**
   - Build command: Leave empty (no build needed)
   - Publish directory: `child-vaccination-system/frontend`
4. **Deploy** → Netlify will deploy the static site immediately

### Step 3: Set Frontend Environment Variables

After deployment, configure the API URL:

1. **Netlify Dashboard** → Site Settings → Environment
2. **Add variable:**
   - Key: `API_BASE_URL`
   - Value: `https://your-render-backend.onrender.com/api`
3. **Trigger redeploy** to apply the environment variable

### Step 4: Enable Redirect Rules

**Netlify configuration is already set in `netlify.toml`:**
- Redirects all routes to dashboard.html for SPA-like routing
- Sets security headers
- Configures caching

---

## Database Setup

### MongoDB Atlas Configuration

1. **Create Cluster**
   - Project: `Child Vaccination System`
   - Cluster: `child-vacc-system`
   - Provider: AWS, Region: closest to your users

2. **Configure Network Access**
   - Add IP Address → "0.0.0.0/0" (allow all) for testing
   - For production, whitelist Render's IP address (check Render settings)

3. **Create Database User**
   - Username: `Vaccinationadmin`
   - Password: Strong, random password
   - Database: Select "child-vaccination-system"

4. **Get Connection String**
   - Click "Connect" → "Drivers"
   - Copy connection string: `mongodb+srv://username:password@cluster.mongodb.net/?appName=child-vacc-system`
   - Use this for `MONGODB_URI` in backend `.env`

5. **Initialize Database**
   - First login after deployment will create collections automatically via Mongoose models
   - Or run seeder: Navigate to backend, run `npm run seed` to populate demo data

---

## Production Checklist

### Backend (Render)

- [x] Node.js 16+ environment
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] `MONGODB_URI` correctly configured
- [ ] `PRODUCTION_URL` points to your frontend domain
- [ ] Email credentials (`EMAIL_USER`, `EMAIL_PASS`) configured
- [ ] Rate limiting is active (500 req/15min)
- [ ] CORS configured for your frontend domain
- [ ] Database backups enabled in MongoDB Atlas
- [ ] Error logging configured (check Render logs)

### Frontend (Netlify)

- [ ] `API_BASE_URL` environment variable set
- [ ] Points to Render backend URL
- [ ] HTTPS enabled (automatic on Netlify)
- [ ] Security headers enabled (set in netlify.toml)
- [ ] Caching configured for CSS/JS (set in netlify.toml)
- [ ] All routes redirect to dashboard.html

---

## Testing Deployment

### 1. Backend API Test
```bash
# Test health endpoint
curl https://your-render-backend.onrender.com/api/health

# Test login (replace with valid credentials)
curl -X POST https://your-render-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"admin123"}'
```

### 2. Frontend Test
1. Open `https://your-frontend.netlify.app`
2. Verify page loads without errors
3. Open browser DevTools → Console → check for any errors
4. Attempt login with test credentials

### 3. Email Test
1. Login to admin account
2. Go to Appointments
3. Click "Send Reminder Emails"
4. Check that guardian emails receive notifications
5. Verify `EMAIL_USER` gmail account has app-specific password enabled

---

## Troubleshooting

### Backend won't start on Render
- Check `NODE_ENV` is not undefined
- Verify `MONGODB_URI` connection string
- Check all required dependencies in `package.json`
- View Render logs: Dashboard → Logs

### Frontend shows "Cannot connect to API"
- Check `API_BASE_URL` environment variable is set
- Verify Render backend is running and accessible
- Check browser DevTools → Network → check API requests
- Verify CORS is configured correctly (check backend/app.js)

### Email not sending
- Verify `EMAIL_USER` and `EMAIL_PASS` are correct
- Confirm Gmail account has app-specific password enabled (not regular password)
- Check that "Less secure app access" is enabled in Gmail settings
- Review Render logs for email errors

### Database connection timeout
- Verify MongoDB Atlas network access includes Render's IP
- Check `MONGODB_URI` syntax
- Ensure `MONGO_DB_NAME` matches your database name
- Test connection locally first

---

## Monitoring & Maintenance

### Monitoring
- **Render Dashboard**: View app logs, check resource usage
- **Netlify Dashboard**: View deployment history, check build logs
- **MongoDB Atlas**: Monitor connection pool, disk usage

### Backups
- **MongoDB**: Enable automatic backups in Atlas
- **Code**: Keep GitHub repository updated with all changes
- **Env Variables**: Keep secure notes of all environment variable values

### Updates
- Always test updates locally before pushing to GitHub
- Render auto-deploys on Git push to main branch
- Netlify auto-deploys on Git push to main branch

---

## Production URLs

Once deployed, update these URLs:

- **Backend API**: `https://your-render-backend.onrender.com/api`
- **Frontend**: `https://your-frontend.netlify.app`
- **Login Page**: `https://your-frontend.netlify.app/pages/login.html`
- **Parent Portal**: `https://your-frontend.netlify.app/pages/parent-login.html`

---

## Support

For issues:
1. Check Render logs: `Render Dashboard → Logs`
2. Check Netlify logs: `Netlify Dashboard → Deploy logs`
3. Check MongoDB Atlas monitoring
4. Review browser DevTools for frontend errors
5. Check email service configuration and Gmail app-specific passwords

---

**Last Updated**: July 2026
**System Version**: 1.0.0
