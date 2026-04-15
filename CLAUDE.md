# OAWeekend

## Deployment

**Never run `vercel --prod` directly from a worktree or feature branch.**

Multiple Claude sessions may be working on this project concurrently. Direct deploys from different branches overwrite each other.

### Deploy process:
1. Commit changes to your branch
2. `git push -u origin <branch>`
3. `gh pr create`
4. `gh pr merge <pr-number> --merge`
5. Deploy from the main repo: `cd /Users/briand/Documents/GitHub/OAWeekend && vercel --prod`
