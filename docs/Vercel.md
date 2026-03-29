# ☁️ Vercel Deployment Guide v0.85

Deploying your Python/Flask backend and frontend to Vercel.

## 1. Preparation

Ensure you have the following files in your project root (already done):

- `app.py` (Your entry point)
- `vercel.json` (Configuration)
- `requirements.txt` (Dependencies)

## 2. Install Vercel CLI

If you haven't already:

```bash
npm install -g vercel
```

*Or you can connect your GitHub repository to Vercel and it will auto-deploy.*

## 3. Login

In your terminal:

```bash
vercel login
```

## 4. Deploy (First Run)

Run the deploy command:

```bash
vercel
```

1. **Set up and deploy?** [Y]
2. **Which scope?** [Select your account]
3. **Link to existing project?** [N]
4. **Project Name?** [tdh-blunt-hunt]
5. **In which directory?** [./]
6. **Want to modify settings?** [N] (Our `vercel.json` handles it)

Vercel will upload/build. **BUT IT WILL FAIL or ERROR at runtime** because we haven't set the secrets yet.

## 5. Configure Secrets (CRITICAL)

Since `.env` is ignored by git (for security), it will **NOT** be uploaded to Vercel.
You **MUST** set the environment variables in Vercel for the game to work.

1. Go to your Vercel Dashboard: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project (`tdh-blunt-hunt`).
3. Go to **Settings** -> **Environment Variables**.
4. Add the following variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `SIGNER_PRIVATE_KEY` | ✅ Yes | Private key for score signing |
| `JWT_SECRET` | ✅ Yes | Run `openssl rand -hex 32`. Must be same across all environments |
| `FLASK_SECRET_KEY` | ✅ Yes | Run `openssl rand -hex 32` |
| `ADMIN_SECRET` | ✅ Yes | Password for `/admin` and `/deploy` routes |
| `ALLOWED_ORIGINS` | ✅ Yes | Your Vercel domain, e.g. `https://tdh-blunt-hunt.vercel.app` |
| `REDIS_URL` | Optional | For persistent rate limiting. Falls back to in-memory |

5. Click **Save**.

## 6. Redeploy

Now that the secrets are set, redeploy to apply changes:

```bash
vercel --prod
```

## 7. Final Check

1. Open your new Vercel URL (e.g., `https://tdh-blunt-hunt.vercel.app`).
2. Your game is live! 🌍
3. The code uses relative paths (`/api/sign-score`), so the backend automatically works on Vercel.

## Troubleshooting

- **500 Error on Sign**: Check Vercel Logs. Usually means `SIGNER_PRIVATE_KEY` is missing or invalid.
- **"Signer not configured"**: You forgot to set `SIGNER_PRIVATE_KEY` in Step 5.
- **"Session expired"**: The `JWT_SECRET` may differ between environments (Production vs Preview). Ensure it's the same.
- **CORS errors**: Make sure `ALLOWED_ORIGINS` includes your Vercel domain.
