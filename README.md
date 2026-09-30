# 🎨 Creative Image Voting Platform — Production Deployment Guide

A high-performance, responsive full-stack web application powered by **PostgreSQL** and **Cloudinary** cloud image storage, designed for mentors managing creative image voting sessions (~75+ students).

---

## ☁️ Cloudinary Production Image Setup Guide

### Step 1: Create a Cloudinary Account
1. Sign up for a free account at [Cloudinary.com](https://cloudinary.com/).
2. Log in to your Cloudinary Dashboard.

### Step 2: Retrieve Credentials
From the **Dashboard Overview** panel, copy:
* **Cloud Name**
* **API Key**
* **API Secret**

### Step 3: Configure Environment Variables
Set the following environment variables on your deployment server (Render / Railway / VPS / Heroku):

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

*(Note: For local development, set `STORAGE_PROVIDER=local` to store files in `./uploads`).*

### Step 4: Verify Image Upload & Deletion
1. Log in to the **Mentor Portal**.
2. Upload a creative student artwork image (JPEG, PNG, or WebP up to 10MB).
3. Verify the image appears in the mentor dashboard.
4. Verify the image URL saved in PostgreSQL begins with `https://res.cloudinary.com/...` with automatic format & quality optimization (`f_auto,q_auto`).
5. Open the public voting link (`/vote/:slug`) as a student — verify the image renders quickly without exposing author registration numbers or vote counts.
6. Delete the image from the mentor session — verify the Cloudinary asset is safely removed.

---

## 🐘 Aiven PostgreSQL Database Setup Guide

1. Sign up at [Aiven Console](https://console.aiven.io/) and create a **PostgreSQL** service.
2. Obtain your PostgreSQL **Service URI / Connection String**.
3. Set environment variables:
   ```env
   DATABASE_URL=postgres://avnadmin:YOUR_PASSWORD@your-aiven-pg.aivencloud.com:28471/defaultdb?sslmode=require
   PGSSLMODE=require
   ```
4. Run schema migration:
   ```bash
   npm run db:migrate
   ```

---

## 🚀 Build & Start Commands

```bash
# Build React Production Bundle
npm run build

# Start Express Production Server
npm start
```
