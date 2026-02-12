# Deployment Guide for Real-Time Chat App

This guide will walk you through deploying your MERN stack application. We will deploy the **Backend to Render** and the **Frontend to Vercel**.

## Prerequisites
-   A GitHub account (your code is already pushed there).
-   Accounts on [Render](https://render.com) and [Vercel](https://vercel.com).

---

## Part 1: Deploy Backend (Render)

1.  **Log in to Render** and go to your **Dashboard**.
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account and select your repository: `real-time-chat-app`.
4.  Configure the service:
    -   **Name**: `real-time-chat-backend` (or similar)
    -   **Region**: Choose the one closest to you.
    -   **Branch**: `main`
    -   **Root Directory**: `backend` (Important!)
    -   **Runtime**: `Node`
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start`
5.  **Environment Variables**:
    -   Scroll down to "Environment Variables" and add the following:
        -   `PORT`: `5000` (or `10000`, Render usually sets this automatically but good to have)
        -   `MONGO_URI`: Your MongoDB connection string (from your local `.env`)
        -   `JWT_SECRET`: Your JWT secret (from your local `.env`)
        -   `CLIENT_URL`: We will add this *after* deploying the frontend. For now, you can leave it empty or set it to `*` to allow all (not recommended for production).
6.  Click **Create Web Service**.
7.  Wait for the deployment to finish. Render will give you a URL like `https://real-time-chat-backend.onrender.com`. **Copy this URL.**

---

## Part 2: Deploy Frontend (Vercel)

1.  **Log in to Vercel** and go to your **Dashboard**.
2.  Click **Add New...** -> **Project**.
3.  Import your `real-time-chat-app` repository.
4.  Configure the project:
    -   **Framework Preset**: Vite
    -   **Root Directory**: Click "Edit" and select `frontend`.
5.  **Environment Variables**:
    -   Add a new variable:
        -   **Name**: `VITE_API_BASE_URL`
        -   **Value**: The backend URL you copied from Render (e.g., `https://real-time-chat-backend.onrender.com`). **IMPORTANT: Do NOT add a trailing slash `/`**.
6.  Click **Deploy**.
7.  Wait for the deployment to finish. Vercel will give you a domain like `https://real-time-chat-app.vercel.app`. **Copy this URL.**

---

## Part 3: Final Configuration

1.  Go back to your **Render Dashboard** (Backend).
2.  Go to **Environment Variables**.
3.  Add or Update `CLIENT_URL` with your **Vercel Frontend URL** (e.g., `https://real-time-chat-app.vercel.app`).
4.  Save changes. Render will restart your backend service.

**🎉 Congratulations! Your Real-Time Chat App is now live!**
