# ProspectIQ – 401k Lead Finder

AI-powered prospect finder for wealth management advisors. Uses Claude AI + live web search to surface new and growing businesses that are strong 401k plan candidates.

---

## How to Deploy (Vercel)

### Step 1 – Upload to GitHub
1. Go to github.com and create a free account
2. Click **+** → **New repository** → name it `prospectiq` → set to Private → Create
3. On the repository page, click **uploading an existing file**
4. Drag and drop the entire contents of this folder (all files and folders)
5. Click **Commit changes**

### Step 2 – Deploy on Vercel
1. Go to vercel.com and sign up free with **Continue with GitHub**
2. Click **Add New Project**
3. Select your `prospectiq` repository
4. Leave all settings as default — Vercel auto-detects Vite/React
5. Click **Deploy**
6. In ~60 seconds you'll have a live URL like `prospectiq.vercel.app`

### Step 3 – Add to Phone Home Screen
**iPhone (Safari):**
1. Open your Vercel URL in Safari
2. Tap the Share button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add**

**Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the three-dot menu
3. Tap **Add to Home Screen**
4. Tap **Add**

The app will appear as an icon on your home screen and open fullscreen like a native app.

---

## Features
- AI-powered web search for 401k prospects
- 0–100 Opportunity Score with sub-scores
- Trigger type checkboxes (all on by default)
- 401k status detection (Yes / No / Unknown)
- Save leads with status tracking (Uncontacted / Contacted / Progressing)
- Email draft + call script per prospect
- Redtail CRM push (enter API key in Settings)
- CSV export per lead or full pipeline

---

## Redtail Setup
1. Open the app → click **Settings** in the nav
2. Enter your Redtail API key
3. Your key is stored only on your device — never sent anywhere except Redtail's API
