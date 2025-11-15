# Deployment Guide

## Railway Deployment

Skyreach is configured to deploy to Railway, which provides full filesystem access needed for the file-based campaign data storage.

### Prerequisites

1. Railway account (https://railway.app)
2. Clerk account for authentication (https://clerk.com)

### Initial Setup

1. **Create a new Railway project:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose the `skyreach` repository
   - Railway will automatically detect the `railway.toml` configuration

2. **Configure environment variables:**

   In your Railway project settings, add the following variables:

   ```bash
   # Clerk Authentication
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # From Clerk dashboard
   CLERK_SECRET_KEY=sk_live_...              # From Clerk dashboard
   ```

   Note: `NODE_ENV=production` is automatically set by Railway.

3. **Deploy:**

   Railway will automatically deploy on push to your main branch. You can also trigger manual deployments from the Railway dashboard.

### Build Process

The build process is defined in `railway.toml`:

1. Install all dependencies: `npm install`
2. Build the web app: `npm run build --workspace=@skyreach/web`
   - This runs `prebuild` script which:
     - Builds all packages
     - Validates encounter content
     - Caches AP totals
   - Then builds the Astro site

### Directory Structure in Deployment

The deployed application includes:
- `/apps/web/dist/` - Built Astro application
- `/data/` - Campaign data files (YAML, JSONL)
- `/packages/` - Shared packages

All data files are part of the Git repository and are deployed with the application.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key for client-side auth |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key for server-side auth |
| `NODE_ENV` | Auto-set | Set to `production` by Railway automatically |

### Monitoring

- **Logs:** Available in Railway dashboard under the "Deployments" tab
- **Health check:** Railway pings `/` endpoint to verify the app is running
- **Restart policy:** Automatically restarts on failure (max 10 retries)

### Troubleshooting

**Build failures:**
- Check that all required data files exist in the repository
- Verify that `data/ap-ledger.jsonl` exists (required by prebuild script)

**Runtime errors:**
- Check Railway logs for details
- Verify environment variables are set correctly
- Ensure Clerk domain is configured for your Railway URL

**Authentication issues:**
- Verify Clerk environment variables are correct
- Check that your Railway deployment URL is added to Clerk's allowed domains

### Local Development

The web app works differently in development vs. production:

- **Dev mode** (`NODE_ENV !== 'production'`):
  - Reads AP ledger directly from filesystem
  - Always shows latest data

- **Production mode** (`NODE_ENV === 'production'`):
  - Uses cached AP totals generated at build time
  - Faster performance

To test production behavior locally:
```bash
NODE_ENV=production npm run preview
```

### Deployment Checklist

Before deploying:
- [ ] All changes committed to Git
- [ ] Tests passing (`npm test`)
- [ ] Build successful locally (`npm run build:web`)
- [ ] Environment variables configured in Railway
- [ ] Clerk domain allowlist updated with Railway URL
