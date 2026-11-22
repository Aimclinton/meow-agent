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

## 3. Supabase (same password = same history on every device, team templates, team quota)

1. Supabase Dashboard → **SQL Editor** → **New query** → paste all of `supabase/schema.sql` → **Run**.
   This creates the tables `meow_usage`, `meow_vaults`, `meow_vault_documents` and `templates`, plus the private storage bucket `meow-pages`.
2. **Project Settings → API**. Copy two values into Vercel → Settings → Environment Variables:

| Vercel variable | Supabase value |
|---|---|
| `SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` / secret key, **never with a `VITE_` prefix and never in chat** |
| `VAULT_SECRET` (optional) | any long random text, e.g. from a password generator |

3. Redeploy.

How it works:
- The browser never talks to Supabase directly. Only the Vercel functions do, with the service key.
- The password itself is never stored. The server keeps an HMAC of it, and every device that logs in with the **same password** opens the same 7-day history.
- The recovery code also works across devices. After a reset, the other devices are told to use the new password.
- `/api/ocr` only accepts people logged in with an existing password (or a personal BYOK key), so outsiders can't use the team quota.
- Templates saved by anyone are shared with the whole team.
- Without Supabase, everything still works on each device on its own, and templates are kept in that browser.

> ⚠️ Anyone who knows (or guesses) a password can open that history. Ask the team to use long passwords
> (e.g. a short Thai phrase plus numbers), not 1234 or birthdays.

## 4. Web3Forms (the “ข้าต้องการสิ่งนี้เพิ่ม” button)

1. Go to <https://web3forms.com>, enter **aimisplayinggg@gmail.com** under “Create your Access Key” and submit.
2. Open that inbox and copy the **Access Key** from Web3Forms' email. The key is tied to that address, so every request lands there.
3. Vercel → Environment Variables → add `VITE_WEB3FORMS_KEY` = the key → **Redeploy**.
   (This key is meant to be public, so `VITE_` is fine. `NEXT_PUBLIC_WEB3FORMS_KEY` also works.)

The form posts in the background (no mail app opens) and shows “แมวรับเรื่องไว้แล้ว เดี๋ยวไปสะกิด Dev ให้นะ!”.

## 5. Files

```
api/ocr.js            Gemini OCR → structured JSON (retry, model fallback, 60 s budget)
api/quota.js          Today's team usage
api/vault.js          Password-based history sync (Supabase, server-side)
api/templates.js      Shared form templates
api/_lib/*            Config, Gemini schema & prompt, Supabase REST helpers
vercel.json           maxDuration 60 for api/ocr.js, SPA rewrites
supabase/schema.sql   Tables, RPC, RLS, storage bucket
public/guide.html     Illustrated user guide
src/services/         ocrClient (queue + fallback), localOcr (Tesseract), vault (sync)
src/pages/ReviewPage  Split-screen review/editor, re-scan, page ordering
src/pages/ExportPage  Fonts TH/EN, DOCX, XLSX, Export as Slide
```
