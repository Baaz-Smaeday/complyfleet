# ComplyFleet — Deploy Guide (Get Live TODAY)

## What you're deploying
- 8 screens of your ComplyFleet prototype
- Hosted on a real URL (e.g. `complyfleet.vercel.app`)
- Your 2 TMs can access it from any browser/phone tomorrow
- Currently uses demo data (real database comes next)

## What you need
- Your GitHub account (you said you have a repo ✅)
- A free Vercel account (takes 2 minutes)
- 15 minutes total

---

## STEP 1 — Push this project to GitHub (5 mins)

### Option A: If your repo is empty
Open your terminal/command prompt:

```bash
# Go to where you downloaded the complyfleet folder
cd complyfleet

# Initialise git
git init
git add .
git commit -m "ComplyFleet prototype - all 8 screens"

# Connect to your GitHub repo (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR-USERNAME/complyfleet.git
git branch -M main
git push -u origin main
```

### Option B: If your repo already has files
```bash
cd complyfleet
git init
git add .
git commit -m "ComplyFleet prototype - all 8 screens"
git remote add origin https://github.com/YOUR-USERNAME/complyfleet.git
git branch -M main
git push -u origin main --force
```

---

## STEP 2 — Create Vercel account & deploy (5 mins)

1. Go to **https://vercel.com** and click "Sign Up"
2. Choose **"Continue with GitHub"** (this connects your repos)
3. Once logged in, click **"Add New Project"**
4. Find your `complyfleet` repo and click **"Import"**
5. Leave ALL settings as default (Vercel auto-detects Next.js)
6. Click **"Deploy"**
7. Wait 1-2 minutes for it to build
8. You'll get a URL like: **`complyfleet.vercel.app`**

**That's it. Your app is live.**

---

## STEP 3 — Share with your TMs (2 mins)

Send your TMs these links:

| Who | What to test | Link |
|---|---|---|
| **TM 1** | Main dashboard | `your-url.vercel.app/dashboard` |
| **TM 2** | Main dashboard | `your-url.vercel.app/dashboard` |
| **TM 1** | Company detail | `your-url.vercel.app/company` |
| **Driver test** | Walkaround check (phone) | `your-url.vercel.app/walkaround` |
| **You** | Super Admin panel | `your-url.vercel.app/admin` |
| **All screens** | Home page | `your-url.vercel.app` |

### All available pages:
- `/` — Home (links to all screens)
- `/dashboard` — TM compliance dashboard
- `/walkaround` — Driver walkaround check (test on phone!)
- `/defects` — Defect management
- `/vehicles` — Vehicle compliance dates
- `/qr-codes` — QR code generation
- `/magic-links` — Backup link sharing
- `/company` — Company detail page
- `/admin` — Your Super Admin panel

---

## STEP 4 — Custom domain (optional, later)

If you own `complyfleet.co.uk`:
1. In Vercel dashboard → your project → Settings → Domains
2. Add `complyfleet.co.uk`
3. Vercel will give you DNS records to add at your domain registrar
4. Free HTTPS included

---

## What to tell your TMs

> "I'm building a new compliance platform. Here's a prototype for you
> to try. Click through all the screens and tell me:
>
> 1. Does this cover what you need day-to-day?
> 2. What's missing?
> 3. Would your drivers actually use the walkaround check form?
> 4. Is anything confusing?
>
> This is demo data for now. Real data comes next week."

---

## What comes next (this week)

Once your TMs have tested and given feedback:

1. **Add Supabase database** (free) — checks and defects save for real
2. **Real QR codes** — scan goes to real walkaround form for that vehicle
3. **TM login** — each TM sees only their companies
4. **Driver auth via magic link** — no password needed for drivers
5. **Stripe billing** — monthly subscriptions for TMs

I can build all of this with you step by step.

---

## Troubleshooting

**Build fails on Vercel?**
- Check the build log — usually a typo or missing file
- Make sure all files from the `complyfleet` folder were pushed to GitHub

**Page shows 404?**
- Make sure the URL matches exactly (e.g. `/qr-codes` not `/qrcodes`)

**Fonts not loading?**
- Google Fonts loads from CDN. If blocked, the app will use system fonts as fallback.

---

## Project structure
```
complyfleet/
├── app/
│   ├── layout.jsx          ← Root layout (font loading)
│   ├── page.jsx             ← Home page (links to all screens)
│   ├── dashboard/page.jsx   ← TM Dashboard
│   ├── walkaround/page.jsx  ← Driver Walkaround Check
│   ├── defects/page.jsx     ← Defect Management
│   ├── vehicles/page.jsx    ← Vehicle Compliance Dates
│   ├── qr-codes/page.jsx    ← QR Code System
│   ├── magic-links/page.jsx ← Magic Links
│   ├── company/page.jsx     ← Company Detail
│   └── admin/page.jsx       ← Super Admin Panel
├── package.json
├── next.config.js
└── .gitignore
```
