# Release Process

Follow these steps for every release:

1. **Commit all changes** with a descriptive message
2. **Bump version** in `package.json` (semver: patch for fixes, minor for features, major for breaking changes)
3. **Build** — `bun run build` (CLI) and `bun run build:gui` (Electron)
4. **Publish to NPM** — Attempt `npm publish --access public --otp=<code>` (ask the user for the OTP from their authenticator app). If it fails with an auth/token error, _then_ run `npm login` and ask the user to complete the browser-based auth flow, then retry publish.
5. **Push to GitHub** — `git push origin main`
6. **Create GitHub release** — `gh release create vX.Y.Z --generate-notes`
