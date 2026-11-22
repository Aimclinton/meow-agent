# MEOW Agent — Setup (Vercel Free + Gemini + Supabase)

## 1. Install & run locally

```bash
npm install
npm run dev          # http://localhost:5173 (copies the offline OCR files first)
```

`npm run dev` serves only the frontend. With no `/api`, scans fall back to on-device OCR.
To run the serverless functions locally too, use `vercel dev` (needs the Vercel CLI and a `.env` file, see `.env.example`).

Main packages (already in `package.json`):

| Package | Used for |
|---|---|
| `@tiptap/*` | Review editor (headings, bold/italic, tables with merged cells, lists) |
| `docx`, `exceljs`, `file-saver` | Word / Excel export |
| `@supabase/supabase-js` | Login, password reset email, history sync |
| `tesseract.js` + `@tesseract.js-data/eng,tha` | Offline fallback OCR (self-hosted, no CDN) |

## 2. Gemini API key (required for AI scanning)

1. Get a free key: <https://aistudio.google.com/app/apikey>
2. Vercel → your project → **Settings → Environment Variables** → add:
   - `GEMINI_API_KEY` = your key (Production + Preview)
3. **Redeploy** (Deployments → ⋯ → Redeploy). Environment variables only apply to new deployments.

The key is read only by `api/ocr.js` on the server. It is never sent to the browser.

Optional variables:

| Name | Default | Meaning |
|---|---|---|
| `GEMINI_MODEL` | `gemini-3.1-flash-lite-preview` | Main model |
| `GEMINI_FALLBACK_MODELS` | `gemini-3-flash-preview,gemini-2.5-flash` | Tried in order on 429/503 |
| `GEMINI_DETAILED_MODEL` | `gemini-3-flash-preview` | For “สแกนหน้านี้ใหม่แบบละเอียด” |
| `DAILY_LIMIT` | `500` | Number shown in the “แมวเลีย” bar (team-wide per day) |

Gemini free-tier limits differ per model and change over time. Check the real numbers for your project in AI Studio → Rate limits.
Daily quotas reset at midnight Pacific time (about 14:00–15:00 in Thailand). The app reloads itself at that moment.

## 3. Supabase (team login, forgot-password email, history sync, shared quota)

1. Supabase Dashboard → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
2. **Authentication → URL Configuration**: set *Site URL* to your Vercel URL (e.g. `https://meow-agent.vercel.app`) and add it to *Redirect URLs*. This makes the password-reset and confirm-email links come back to the app.
3. (Recommended for a 10-person team) **Authentication → Sign In / Providers → Email**: turn off “Allow new users to sign up”, then invite each member from **Authentication → Users → Invite user**.
4. **Project Settings → API**. Copy these into Vercel → Environment Variables:

| Vercel variable | Supabase value | Visible to browser? |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | yes (safe) |
| `VITE_SUPABASE_ANON_KEY` | `anon` / publishable key | yes (safe, protected by RLS) |
| `SUPABASE_URL` | Project URL | no |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` / secret key | **no — never prefix with `VITE_`** |

5. Redeploy.

When Supabase is configured:
- The login screen becomes email + password, with “ลืมรหัสผ่าน?” sending a reset link by email.
- `/api/ocr` only accepts signed-in members (or a personal BYOK key), so strangers can't use the team quota.
- The “แมวเลีย” number is shared by the whole team (table `meow_usage`).
- History (7 days) syncs across each member's devices. Images go in the private `meow-pages` bucket.

Without Supabase, the app still works fully on each device with the local password and recovery code.

## 4. Files

```
api/ocr.js            Gemini OCR → structured JSON (retry, model fallback, 60 s budget)
api/quota.js          Today's team usage
api/_lib/*            Config, Gemini schema & prompt, Supabase REST helpers
vercel.json           maxDuration 60 for api/ocr.js, SPA rewrites
supabase/schema.sql   Tables, RPC, RLS, storage bucket
public/guide.html     Illustrated user guide
src/services/         ocrClient (queue + fallback), localOcr (Tesseract), sync (Supabase)
src/pages/ReviewPage  Split-screen review/editor, re-scan, page ordering
src/pages/ExportPage  Fonts TH/EN, DOCX, XLSX, Export as Slide
```
