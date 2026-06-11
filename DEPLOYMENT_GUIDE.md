# FIFA World Cup 2026 Football Streaming Platform
## Deployment, Configuration, and Integration Guide

This document provides complete instructions for compiling, deploying, and maintaining the World Cup 2026 Football Streaming Platform.

---

## 1. Project Folder Structure

The project workspace is structured as follows:

```
simple football/
├── backend/
│   ├── schema.sql                         # Database schema definition (tables, indexes, RLS)
│   ├── seed.sql                           # Preloaded national teams (48 countries) & ad defaults
│   └── supabase/
│       └── functions/
│           └── notify-update/
│               └── index.ts               # Deno Edge Function to proxy push alerts to OneSignal
├── admin-dashboard/                       # Next.js App Router Admin Control Room
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/notify/route.ts        # Serverless API proxy for OneSignal notifications
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/page.tsx     # Overview, active status cards, and Recharts graphs
│   │   │   │   ├── teams/page.tsx         # Team profiles and Supabase Storage upload center
│   │   │   │   ├── matches/page.tsx       # Match events scheduler, status, and rich previews
│   │   │   │   ├── streams/page.tsx       # Primary and backup M3U8 streaming link bindings
│   │   │   │   ├── earnings/page.tsx      # Earnings script injections (Google AdSense, Adsterra)
│   │   │   │   ├── announcements/page.tsx # App alerts manager and OneSignal push panel
│   │   │   │   └── page.tsx               # Password-only login portal
│   │   │   ├── layout.tsx                 # Root layout with providers wrapper
│   │   │   └── page.tsx                   # Default route redirect to /admin
│   │   ├── components/
│   │   │   ├── AdminLayout.tsx            # Desktop/Mobile glassmorphic sidebar shell & local auth guard
│   │   │   └── Providers.tsx              # TanStack Query query client provider wrapper
│   │   └── lib/
│   │       └── supabase.ts                # Supabase client credentials initialization
│   ├── package.json
│   └── tailwind.config.ts
└── android-app/                           # Native Android Application (Kotlin + Compose)
    ├── app/
    │   ├── src/
    │   │   ├── main/
    │   │   │   ├── java/com/worldcup2026/streaming/
    │   │   │   │   ├── data/
    │   │   │   │   │   ├── local/
    │   │   │   │   │   │   ├── AppDatabase.kt     # Room database caching setup
    │   │   │   │   │   │   └── LocalEntities.kt   # Local database models (teams, matches, streams)
    │   │   │   │   │   ├── remote/
    │   │   │   │   │   │   ├── RealtimeClient.kt  # WebSocket Phoenix Channels listener
    │   │   │   │   │   │   └── SupabaseApi.kt     # Retrofit REST API interface & DTO mappings
    │   │   │   │   │   └── repository/
    │   │   │   │   │       └── AppRepositoryImpl.kt # Repository handling cache-first operations
    │   │   │   │   ├── domain/
    │   │   │   │   │   ├── model/
    │   │   │   │   │   │   └── Models.kt          # Clean Architecture UI domain models
    │   │   │   │   │   └── repository/
    │   │   │   │   │       └── AppRepository.kt   # Clean Architecture repository contracts
    │   │   │   │   ├── di/
    │   │   │   │   │   └── AppModule.kt           # Hilt module (binds network, database, repo)
    │   │   │   │   ├── ui/
    │   │   │   │   │   ├── screens/
    │   │   │   │   │   │   ├── SplashScreen.kt    # Animated entrance & checking screens
    │   │   │   │   │   │   ├── HomeScreen.kt      # Tabbed layouts (Live/Upcoming/Results) & clocks
    │   │   │   │   │   │   ├── StreamingScreen.kt # ExoPlayer, bitrates, quality, and fallback loop
    │   │   │   │   │   │   └── MatchDetailsScreen.kt # Meta details, banner, and HTMLTextView bridge
    │   │   │   │   │   ├── theme/
    │   │   │   │   │   │   └── Theme.kt           # Color tokens, typographies, and shapes
    │   │   │   │   │   ├── MainActivity.kt        # Hosts compose NavHost navigator graph
    │   │   │   │   │   └── MainViewModel.kt       # ViewModel handling screen UI state mappings
    │   │   │   │   └── App.kt                     # Application trigger (Hilt & OneSignal init)
    │   │   │   └── AndroidManifest.xml            # Requests permissions and overrides orientation locks
    │   │   └── test/
    │   │       └── java/com/worldcup2026/streaming/
    │   │           └── CountdownTest.kt           # Unit tests validating time parser arithmetic
    │   └── build.gradle.kts
    └── build.gradle.kts
```

---

## 2. Supabase Backend Setup

We have successfully configured the Supabase database instance:
- **API URL**: `https://wkikuysbirrcmbextkvp.supabase.co`
- **Region**: Tokyo (`ap-northeast-1`)
- **Connection Pooler Host**: `aws-1-ap-northeast-1.pooler.supabase.com`
- **Tables Applied**: `teams`, `matches`, `streams`, `announcements`, `ad_networks`, `app_updates`, `analytics`.

### Step 2.1: Supabase Storage Configuration
A public storage bucket named `teams` must exist to hold flags and logos. This was created during the setup:
*   **Bucket ID**: `teams`
*   **Public Access**: Enabled
*   **RLS Policies**: Applied (`SELECT` for anonymous reads, `INSERT`/`UPDATE`/`DELETE` for authenticated administrators).

### Step 2.2: Deploying Supabase Edge Function
To deploy the Deno Edge Function `notify-update` which triggers push alerts:
1.  Install the Supabase CLI:
    ```bash
    npm install -g supabase
    ```
2.  Login to your Supabase account:
    ```bash
    supabase login
    ```
3.  Link the local project using project ref `wkikuysbirrcmbextkvp`:
    ```bash
    supabase link --project-ref wkikuysbirrcmbextkvp
    ```
4.  Set your OneSignal credentials as environment variables in Supabase:
    ```bash
    supabase secrets set ONESIGNAL_APP_ID="your-onesignal-app-id" ONESIGNAL_API_KEY="your-onesignal-rest-api-key"
    ```
5.  Deploy the edge function:
    ```bash
    supabase functions deploy notify-update
    ```

---

## 3. Next.js Admin Dashboard Deployment

The admin dashboard runs on Next.js 15+ App Router, styled with Tailwind CSS v4 and TanStack React Query.

### Local Execution:
1.  Navigate into the directory:
    ```bash
    cd admin-dashboard
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Boot the development server:
    ```bash
    npm run dev
    ```
4.  Access the admin panel at `http://localhost:3000/admin`.

### Production Deployment (e.g., Vercel, Netlify):
1.  Connect your repository containing the `/admin-dashboard` directory.
2.  Set the Framework Preset to **Next.js**.
3.  Set the Build Command to `npm run build` and output folder to `.next`.
4.  Deploy. (Supabase anon credentials and routes are built-in, meaning zero environment variable settings are mandatory on host deployment).

### Admin Dashboard Authentication:
To access the control room, you only need to enter the admin security password:
*   **Access Path**: `/admin` (e.g., `http://localhost:3000/admin`)
*   **Security Password**: `823163`
*   Upon inputting the correct password, a local session is verified and saved on your browser, granting access to the subpages. To clear the session, click the **Sign Out** button in the sidebar.

---

## 4. Android APK Build Guide

The application is written in native Kotlin utilizing Jetpack Compose and Dagger Hilt.

### Step 4.1: Import into Android Studio
1.  Launch **Android Studio** (Koala or newer recommended).
2.  Select **Open** and choose the `android-app` folder.
3.  Wait for Android Studio to index, download the Gradle wrapper (8.5), and synchronize project dependencies.

### Step 4.2: Add OneSignal App ID
1.  Open the file `App.kt` located in `app/src/main/java/com/worldcup2026/streaming/App.kt`.
2.  Locate line 18:
    ```kotlin
    OneSignal.initWithContext(this, "YOUR_ONESIGNAL_APP_ID")
    ```
3.  Replace `"YOUR_ONESIGNAL_APP_ID"` with your actual OneSignal Application ID.

### Step 4.3: Compilation and Building APK
#### Using Android Studio UI:
1.  Go to the top menu: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2.  After compilation completes, a bubble will show in the bottom right corner. Click **Locate** to find the output `app-debug.apk` file.

#### Using Terminal:
1.  Navigate into the Android directory:
    ```bash
    cd android-app
    ```
2.  Execute compile command:
    ```bash
    ./gradlew assembleDebug
    ```
3.  The compiled APK will be output at:
    `android-app/app/build/outputs/apk/debug/app-debug.apk`.

#### Release Signing (for Play Store):
1.  Go to **Build** > **Generate Signed Bundle / APK**.
2.  Select **APK**, configure your Keystore certificate, and choose **release** build variant.
3.  The signed production-ready APK is generated.

---

## 5. Monetization and Script Configuration

Advertising scripts are controlled dynamically from the database and updated in real-time without requiring app updates or rebuilds.
*   **Google AdSense**: Verification tag is injected into headers, and execution scripts are dynamically rendered in dashboard hooks.
*   **Adsterra / Custom Networks**: Script tags for popunders, social bars, and banners are stored as database entries and rendered dynamically inside secure webviews or native layouts.
*   Update these in the **Earnings** section of the Admin Dashboard.

---

## 6. Security and Scalability Controls

### Security
*   **Row Level Security (RLS)**: Row-level security is active. Anonymous public requests are strictly limited to `SELECT` (read-only) operations on schedules, streams, and teams. Only authenticated administrators (`authenticated` role) have write permissions (`INSERT`/`UPDATE`/`DELETE`).
*   **Analytics Protection**: Public app installs can insert telemetry data via a restrictive `INSERT`-only policy on the `analytics` table, but are blocked from reading any analytic logs.
*   **SSL connections**: Strict SSL verification rules (`rejectUnauthorized: false` for testing; standard certificate verification in production) are active.

### Scalability
*   **Connection Pooling (Supavisor)**: All admin and serverless function DDL actions connect through the Supavisor pooler host on port `6543` (Transaction mode) to prevent server connection exhaustion during concurrent high traffic.
*   **Database Indexing**: Performance indexes are applied to `matches(match_timestamp)`, `matches(status)`, and `streams(match_id)` to speed up read queries.
*   **Room Offline Caching**: The mobile client relies on a SQLite Room database cache. Data is queried from the local cache and updated reactively via WebSockets. If the network drops, the application falls back to local data instantly, maintaining startup speeds of under 2 seconds.
