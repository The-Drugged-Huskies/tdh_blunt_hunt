# ☁️ Vercel Deployment Guide v0.69

Deploying your Python/Flask backend and frontend to Vercel is easy.

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

Vercel will upload/build. **BUT IT WILL FAIL or ERROR at runtime** because we haven't set the Private Key yet.

## 5. Configure Secrets (CRITICAL)

Since `env.json` is ignored by git (for security), it will **NOT** be uploaded to Vercel.
You **MUST** set the environment variable in Vercel for the game to work.

1. Go to your Vercel Dashboard: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project (`tdh-blunt-hunt`).
3. Go to **Settings** -> **Environment Variables**.
4. Add a new variable:
    - **Key**: `SIGNER_PRIVATE_KEY`
    - **Value**: `0x...` (Copy from your local `env.json`)
5. Click **Save**.

## 6. Redeploy

Now that the secret is there, redeploy to apply changes:

```bash
vercel --prod
```

## 7. Final Check

1. Open your new Vercel URL (e.g., `https://tdh-blunt-hunt.vercel.app`).
2. Your game is live! 🌍
3. **IMPORTANT**: You need to update `wallet.js` and `admin.html`?
    - **No!** `wallet.js` runs in the browser, so it just needs the *Contract Address*.
    - **However**, if you hardcoded `http://localhost:5000` anywhere, change it. But our code uses relative paths (`/api/sign-score`), so it will automatically work on Vercel!

## Troubleshooting

- **500 Error on Sign**: Check Vercel Logs. usually means `SIGNER_PRIVATE_KEY` is missing or invalid.

- **"Signer not configured"**: You forgot Step 5.
