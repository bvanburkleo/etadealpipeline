# ETA Deal Pipeline CRM — Setup Guide

A complete step-by-step walkthrough to get your deal pipeline running as a live website you can access from any device.

---

## What You're Setting Up

You're deploying a personal CRM web app with three free services:

- **Supabase** (database) — stores your deal data in the cloud so it syncs across all your devices
- **GitHub** (code hosting) — holds your app's source code
- **Vercel** (web hosting) — makes it a live website you can bookmark or add to your phone's home screen

Total cost: $0. All three have generous free tiers that will more than cover a single-user CRM.

Total time: ~30 minutes for first-time setup.

---

## Step 1: Create a Supabase Account & Project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign up with your GitHub account (or email — but GitHub is easier since you'll need it anyway)
3. Once logged in, click **New Project**
4. Fill in:
   - **Name:** `eta-deal-pipeline`
   - **Database Password:** Choose something strong and save it somewhere (you won't need it often, but don't lose it)
   - **Region:** Choose **US East (N. Virginia)** — closest to Houston
5. Click **Create new project** — it takes about 2 minutes to provision

### Run the Database Setup Script

6. In your Supabase dashboard, click **SQL Editor** in the left sidebar
7. Click **New query**
8. Open the file `supabase-setup.sql` from the project I gave you (it's in the downloaded zip)
9. Copy the entire contents and paste it into the SQL Editor
10. Click **Run** (or Ctrl+Enter)
11. You should see "Success. No rows returned" — that means your table was created

### Get Your API Keys

12. In the left sidebar, click **Settings** (gear icon) → **API**
13. You'll see two values you need — keep this page open:
    - **Project URL** — looks like `https://abcdefghij.supabase.co`
    - **anon / public key** — a long string starting with `eyJ...`

---

## Step 2: Create a GitHub Account & Repository

If you already have a GitHub account, skip to step 3.

1. Go to [github.com](https://github.com) and click **Sign up**
2. Follow the prompts to create your account
3. Verify your email

### Create a New Repository

4. Click the **+** button in the top-right corner → **New repository**
5. Fill in:
   - **Repository name:** `eta-deal-pipeline`
   - **Visibility:** Private (your deal data configs shouldn't be public)
   - Leave everything else as default
6. Click **Create repository**
7. Keep this page open — you'll need the instructions it shows

---

## Step 3: Download & Configure the Project

### Download the Project Files

Download the zip file I provided. It contains:

```
eta-crm/
├── package.json          (project dependencies)
├── vite.config.js        (build configuration)
├── index.html            (entry point)
├── .env.example          (template for your secret keys)
├── .gitignore            (keeps secrets out of GitHub)
├── supabase-setup.sql    (database script — already ran this)
└── src/
    ├── main.jsx          (React entry)
    ├── App.jsx           (the full CRM app)
    └── supabaseClient.js (database connection)
```

### Add Your Supabase Keys

8. In the project folder, copy `.env.example` to a new file called `.env.local`
9. Open `.env.local` in any text editor (Notepad, VS Code, TextEdit — anything works)
10. Replace the placeholder values with your actual Supabase keys from Step 1:

```
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-actual-key-here
```

11. Save the file

**Important:** The `.gitignore` file ensures `.env.local` never gets uploaded to GitHub, so your keys stay private.

---

## Step 4: Push to GitHub

You'll need to do this from a terminal (command line). If you're on Windows, use **Command Prompt** or **PowerShell**. On Mac, use **Terminal**.

### Install Git (if you don't have it)

- **Windows:** Download from [git-scm.com](https://git-scm.com/download/win) and install with defaults
- **Mac:** Open Terminal and type `git --version` — if it's not installed, it'll prompt you to install Xcode Command Line Tools

### Push Your Code

12. Open your terminal and navigate to the project folder:

```bash
cd ~/Downloads/eta-crm
```

(Adjust the path to wherever you unzipped the files)

13. Run these commands one by one:

```bash
git init
git add .
git commit -m "Initial commit - ETA Deal Pipeline CRM"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/eta-deal-pipeline.git
git push -u origin main
```

**Replace `YOUR-USERNAME`** with your actual GitHub username.

If prompted to log in, enter your GitHub credentials. (GitHub may ask you to use a Personal Access Token instead of a password — if so, go to GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token, give it `repo` scope, and use that as your password.)

---

## Step 5: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and click **Sign Up**
2. Choose **Continue with GitHub** and authorize Vercel to access your account
3. Click **Add New...** → **Project**
4. You should see your `eta-deal-pipeline` repository — click **Import**

### Add Your Environment Variables

5. Before clicking Deploy, scroll down to **Environment Variables**
6. Add these two variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...your-anon-key` |

7. Click **Deploy**
8. Wait 1-2 minutes for it to build

### You're Live!

9. Vercel will show you a URL like `eta-deal-pipeline.vercel.app` — that's your CRM!
10. Click it to open your live pipeline. You should see the empty state with the "Add Your First Deal" button.

---

## Step 6: Add to Your Phone (Optional but Recommended)

### iPhone
1. Open Safari and go to your Vercel URL
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Name it "Deal Pipeline" and tap **Add**

### Android
1. Open Chrome and go to your Vercel URL
2. Tap the **three dots** menu → **Add to Home screen**
3. Name it and tap **Add**

It'll now appear on your home screen like a regular app.

---

## Troubleshooting

**"Failed to load deals" error after deploying:**
- Double-check your environment variables in Vercel (Settings → Environment Variables)
- Make sure there are no extra spaces in the values
- Redeploy after changing env vars: go to Deployments tab → click the three dots on the latest → Redeploy

**SQL script didn't work:**
- Make sure you ran it in Supabase's SQL Editor, not somewhere else
- Check that you copied the entire script including the `create policy` line

**Git push rejected:**
- Make sure the repository name in the `git remote add` command matches exactly
- Try `git remote -v` to verify the URL is correct

**Page is blank after deploy:**
- Open browser dev tools (F12) → Console tab to see any errors
- Usually means the Supabase URL or key is wrong

---

## Making Changes Later

If you ever want to update the app (new fields, different stages, etc.), just:

1. Edit the files locally
2. Run:

```bash
git add .
git commit -m "Description of what you changed"
git push
```

3. Vercel automatically redeploys within ~60 seconds

---

That's it! You now have a fully functional, cloud-synced deal pipeline CRM accessible from any device.
