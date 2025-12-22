# Railway PR Preview - Team Guide

## ✅ Works for Everyone on Your Team

The Railway PR Preview workflow is **automatically enabled for all team members**. No individual setup required!

## How It Works for Your Team

### For You (Repository Owner/Admin)
1. ✅ Set up Railway secrets once (see `RAILWAY_SETUP.md`)
2. ✅ All team PRs will automatically get preview environments
3. ✅ You can see all preview URLs in PR comments

### For Your Teammates
1. ✅ **No setup needed** - just create PRs normally
2. ✅ Every PR automatically gets a preview environment
3. ✅ Preview URL appears in PR comments automatically
4. ✅ Each PR is isolated (won't affect others)

## Example Workflow

### Scenario: Teammate Creates PR

1. **Teammate opens PR #50:**
   ```
   Teammate: "Hey, I added a new API endpoint"
   → Creates PR #50
   ```

2. **GitHub Actions automatically:**
   ```
   ✅ Detects PR #50 opened
   ✅ Creates Railway service: api-pr-50
   ✅ Deploys Express app
   ✅ Comments on PR with preview URL
   ```

3. **PR Comment appears:**
   ```markdown
   ## 🚀 Preview Environment Deployed
   
   **Preview API URL:** https://api-pr-50.up.railway.app
   
   PR #50
   Branch: feature/new-endpoint
   ```

4. **Everyone can:**
   - ✅ See the preview URL in PR comments
   - ✅ Test the API at the preview URL
   - ✅ Review the changes with live backend

5. **When PR is closed:**
   ```
   ✅ Railway service api-pr-50 is deleted
   ✅ Cleanup comment posted
   ✅ No manual cleanup needed
   ```

## Multiple PRs Simultaneously

**Multiple team members can have PRs open at the same time:**

- PR #50 → `api-pr-50` → https://api-pr-50.up.railway.app
- PR #51 → `api-pr-51` → https://api-pr-51.up.railway.app
- PR #52 → `api-pr-52` → https://api-pr-52.up.railway.app

**Each PR is completely isolated:**
- ✅ Separate Railway services
- ✅ Separate environment variables
- ✅ Separate databases (if configured)
- ✅ No interference between PRs

## Permissions & Access

### Repository Permissions Required
- **Write access** to repository (to create PRs)
- That's it! No Railway account needed for team members

### What Team Members See
- ✅ Preview URL in their PR comments
- ✅ Can test their preview environment
- ✅ Can see deployment status in GitHub Actions

### What Team Members DON'T Need
- ❌ Railway account
- ❌ Railway tokens
- ❌ Railway CLI installation
- ❌ Any manual setup

## Sharing Preview URLs

**Easy sharing:**
1. Copy preview URL from PR comment
2. Share with QA team, product managers, etc.
3. They can test immediately
4. No need to wait for merge to staging

**Example:**
```
Teammate: "PR ready for review! 
Preview: https://api-pr-50.up.railway.app"
```

## Troubleshooting for Team Members

### "I don't see a preview URL"
- ✅ Check PR comments (scroll down)
- ✅ Check GitHub Actions tab (workflow may still be running)
- ✅ Wait 2-3 minutes after PR creation
- ✅ Check if workflow failed (Actions tab)

### "Preview URL doesn't work"
- ✅ Wait 1-2 minutes after deployment completes
- ✅ Check Railway service status (you can check in Railway dashboard)
- ✅ Verify service is running (not crashed)

### "My PR didn't deploy"
- ✅ Check GitHub Actions tab for errors
- ✅ Verify repository secrets are set (admin only)
- ✅ Check Railway account limits (admin only)

## Best Practices

### For Team Members
1. ✅ Create PRs normally - preview deploys automatically
2. ✅ Test your preview URL before requesting review
3. ✅ Share preview URL in PR description for easy access
4. ✅ Close PRs when done (cleanup happens automatically)

### For Repository Admins
1. ✅ Monitor Railway usage/costs
2. ✅ Check Railway dashboard periodically
3. ✅ Ensure secrets are up to date
4. ✅ Review workflow logs if issues occur

## FAQ

**Q: Do team members need Railway accounts?**  
A: No! Everything uses shared repository secrets.

**Q: Can multiple PRs run at the same time?**  
A: Yes! Each PR gets its own isolated service.

**Q: What if Railway runs out of resources?**  
A: Check Railway dashboard for limits. Consider upgrading plan if needed.

**Q: Can I disable preview for specific PRs?**  
A: Not currently, but you can manually delete the service in Railway dashboard.

**Q: Who pays for Railway usage?**  
A: The Railway account linked to `RAILWAY_TOKEN` pays for all preview environments.

## Summary

✅ **One-time setup** (you, the admin)  
✅ **Works for everyone** (all team members)  
✅ **Automatic** (no manual steps)  
✅ **Isolated** (each PR separate)  
✅ **Self-cleaning** (deletes on PR close)

Your team can focus on code, not deployment! 🚀

