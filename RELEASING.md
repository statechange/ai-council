# Release Process

Follow these steps for every release:

1. **Commit all changes** with a descriptive message
2. **Bump version** in `package.json` (semver: patch for fixes, minor for features, major for breaking changes)
3. **Build** — `bun run build` (CLI) and `bun run build:gui` (Electron)
4. **Login to NPM** — Run `npm login` and ask the user to complete the browser-based auth flow
5. **Publish to NPM** — `npm publish --access public` (requires OTP from authenticator app via `--otp=<code>` — ask the user for the code)
6. **Push to GitHub** — `git push origin main`
7. **Create GitHub release** — `gh release create vX.Y.Z --generate-notes`
