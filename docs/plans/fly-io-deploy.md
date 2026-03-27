# Deploy to Fly.io

## Status: In Progress

## Purpose
Deploy the Yaniv score tracker SPA to Fly.io for public access.

## Approach
Since the app uses `adapter-static` (SPA mode), we serve the pre-built static files using nginx in a multi-stage Docker build.

## Files to Create
- `Dockerfile` — Multi-stage: Node build + nginx serve
- `fly.toml` — Fly.io app configuration
- `.dockerignore` — Exclude unnecessary files from build context
- `nginx.conf` — Custom nginx config for SPA routing (all routes → index.html)

## Deployment Steps
1. Create Dockerfile (multi-stage: pnpm build → nginx)
2. Create fly.toml with app config
3. Create .dockerignore
4. Create nginx.conf for SPA fallback routing
5. Run `fly launch` to create the app (or `fly deploy` if already created)

## Notes
- No adapter change needed — static build served by nginx
- SPA fallback: nginx `try_files` sends all routes to `index.html`
- PWA service worker registration is handled client-side
