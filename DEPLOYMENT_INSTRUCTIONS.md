# Deployment Instructions

This document provides step-by-step instructions for deploying the Delta TV DEC application to Vercel (frontend) and Render (backend).

## Prerequisites

1. Accounts:
   - Vercel account (https://vercel.com/)
   - Render account (https://render.com/)

2. Tools:
   - Git installed on your machine
   - Node.js and npm installed

## Backend Deployment (Render)

### 1. Prepare Your Repository

Ensure your repository is pushed to a Git provider (GitHub, GitLab, or Bitbucket).

### 2. Deploy to Render

1. Go to https://dashboard.render.com/
2. Click "New+" and select "Web Service"
3. Connect your Git repository
4. Configure the following settings:
   - Name: `delta-tv-dec-backend` (or your preferred name)
   - Region: Select the region closest to your users
   - Branch: `main` (or your default branch)
   - Root Directory: `server`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Select your preferred plan (free tier available)

### 3. Set Environment Variables

In the Render dashboard, go to your service > Settings > Environment Variables and add:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
NODE_ENV=production
```

Note: The `PORT` variable is automatically set by Render.

### 4. Deploy

Click "Create Web Service" and wait for the deployment to complete.

## Frontend Deployment (Vercel)

### 1. Prepare Your Repository

Ensure your repository is pushed to a Git provider (GitHub, GitLab, or Bitbucket).

### 2. Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your Git repository
4. Configure the project:
   - Project Name: `delta-tv-dec-frontend` (or your preferred name)
   - Framework Preset: Create React App
   - Root Directory: `client`
   - Build and Output Settings:
     - Build Command: `npm run build`
     - Output Directory: `build`

### 3. Set Environment Variables

In the Vercel dashboard, go to your project > Settings > Environment Variables and add:

```
REACT_APP_API_URL=https://your-render-app-url.onrender.com/api
```

Replace `your-render-app-url` with the actual URL of your deployed backend.

### 4. Deploy

Click "Deploy" and wait for the deployment to complete.

## Post-Deployment Steps

1. Once your backend is deployed, update the `REACT_APP_API_URL` in Vercel with the actual Render URL.
2. Test the application by accessing the frontend URL.
3. Log in with the admin credentials you set in the environment variables.

## Troubleshooting

### Common Issues

1. **CORS Errors**: 
   - Ensure your backend CORS configuration allows requests from your frontend domain.
   - The current backend configuration allows all origins (`"*"`), which should work for testing.

2. **Environment Variables Not Loading**:
   - Ensure all environment variables are correctly set in both platforms.
   - Restart the services after updating environment variables.

3. **Build Failures**:
   - Check the build logs in both platforms for specific error messages.
   - Ensure all dependencies are correctly listed in package.json files.

### Support

If you encounter any issues during deployment, check the documentation for:
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs