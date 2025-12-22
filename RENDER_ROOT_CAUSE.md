# Render Deployment - Root Cause Analysis

## The Real Problem

Looking at the Render logs:
```
==> Running build command 'npm install'...
```

But `render.yaml` specifies:
```yaml
buildCommand: npm install && npm run build
```

**Render is NOT running `npm run build`!** This means:
- ✅ `npm install` runs (dependencies installed)
- ❌ `npm run build` does NOT run (TypeScript never compiles)
- ❌ `dist/` folder is never created
- ❌ `dist/index.js` doesn't exist

## Why This Happens

Render might be:
1. **Not reading render.yaml** - Dashboard settings override it
2. **Auto-detecting build command** - Only runs `npm install` by default
3. **Root directory issue** - Render thinks root is `/opt/render/project/src/` instead of `/opt/render/project/`

## Evidence

From the logs:
- `Using Node.js version 25.2.1 via /opt/render/project/src/package.json` ← Render thinks root is `src/`
- `Current directory: /opt/render/project/src` ← Running from wrong directory
- `Error: Cannot find dist/index.js` ← Because it was never built!

## Solutions

### Solution 1: Fix Build Command in Render Dashboard (RECOMMENDED)

1. Go to Render Dashboard → Your Service → Settings
2. **Build Command**: Change from `npm install` to:
   ```
   npm install && npm run build
   ```
3. **Root Directory**: Leave empty OR set to `/` (project root)
4. Save and redeploy

### Solution 2: Auto-Build in Start Script (FALLBACK)

Updated `scripts/start.js` to automatically build if `dist/` doesn't exist:

```javascript
// If dist doesn't exist, try to build
if (!fs.existsSync(distPath)) {
  console.warn('⚠️ dist/index.js not found. Attempting to build...');
  execSync('npm run build', { stdio: 'inherit' });
}
```

This is a workaround, but the real fix is Solution 1.

### Solution 3: Verify render.yaml Location

Ensure `render.yaml` is at the **repository root**, not in a subdirectory.

## Recommended Fix Steps

1. **In Render Dashboard**:
   - Settings → Build Command: `npm install && npm run build`
   - Settings → Start Command: `npm start`
   - Settings → Root Directory: Leave empty (or `/`)

2. **Verify render.yaml** is at repo root and committed

3. **Redeploy** and check logs:
   - Should see: `Running build command 'npm install && npm run build'`
   - Should see: `> tsc` (TypeScript compiling)
   - Should see: `dist/` folder created

## Why render.yaml Might Not Work

Render's `render.yaml` might be ignored if:
- Dashboard settings override it
- File is in wrong location
- YAML syntax errors
- Service was created before render.yaml existed

**Always verify build command in dashboard settings!**


