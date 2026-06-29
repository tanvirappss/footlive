# FIFA World Cup 2026 Football Streaming Platform ⚽📺

A complete, high-performance football live streaming and admin management platform for the FIFA World Cup 2026, featuring real-time scoreboard synchronization, push notifications, and live stream servers rotation.

---

## 🚀 One-Click Deployment to Render

You can deploy the web app (website & admin control panel) to Render.com with a single click:

[![Deploy to Render](https://render.com/images/deploy-to-render.svg)](https://render.com/deploy?repo=https://github.com/tanvirappss/footlive)

*Render will automatically read the `render.yaml` blueprint configuration in this repository, set up a Node.js web service, install dependencies, build the Next.js app, and start serving it.*

---

## 🛠️ Project Components

1. **`admin-dashboard/`** (Next.js Application):
   * **Web Application**: The public-facing site where users view live matches, check upcoming lists, search past fixtures, and stream matches.
   * **Admin Panel**: Control room to schedule matches, rotate stream server links, configure ad injections, manage alarms/sounds, and send OneSignal push alerts.
2. **`backend/`** (Supabase Database configuration):
   * Supabase tables, storage buckets, Row Level Security (RLS) policies, and Deno Edge Function scripts.
3. **`android-app/`** (Native Android App):
   * Native app built in Kotlin & Jetpack Compose featuring low-latency ExoPlayer, backup server rotations, and OneSignal push alerts.

---

## ⚙️ Manual Deployment Instructions

If you prefer to deploy manually to Render, follow these settings:

1. Create a new **Web Service** on Render.
2. Connect your GitHub repository (`https://github.com/tanvirappss/footlive`).
3. Set the following configurations:
   * **Root Directory**: `admin-dashboard`
   * **Environment**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
4. Under **Advanced Settings**, add the environment variable:
   * `NODE_VERSION` = `20`
5. Click **Create Web Service**.
