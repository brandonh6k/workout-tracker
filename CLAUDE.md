# Workout Tracker - Claude Code Instructions

See [AGENTS.md](./AGENTS.md) for full project context: domain model, architecture decisions, file organization, and conventions.

## Quick Reference

- **Stack**: React 19 + TypeScript + Tailwind CSS v4 + Supabase
- **Deployment**: Vercel (auto-deploy on push to main)
- **Tests**: `npm run test:run` (Vitest)
- **Build**: `npm run build`
- **Dev**: `npm run dev`
- **Lint**: `npm run lint`
- **Issue tracker**: Beads (`bd` CLI) - issues stored in `.beads/`

## Beads Workflow

When closing a bead and committing, always do it as a **single commit**:

```bash
bd close <id>
bd sync
git add <changed-files> .beads/issues.jsonl
git commit -m "Description\n\nCloses <id>"
git push
```

Never create a separate "Sync beads issue state" commit.

## Local Development

Local Supabase runs via Docker. `.env.local` points at `http://127.0.0.1:54321`.

```bash
npm run db:start    # Start local Supabase (Postgres, Auth, REST API)
npm run db:stop     # Stop local Supabase
npm run db:reset    # Re-apply all migrations (wipes local data)
npm run db:studio   # Open Supabase Studio UI
npm run dev         # Start Vite dev server (port 5173)
```
