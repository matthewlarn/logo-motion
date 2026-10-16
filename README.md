# Logo Motion

SVG logo write-on editor, including the Kickback example logo.

## Run locally

Requires Node.js 18 or newer. No dependency installation is needed.

1. Unzip the archive.
2. Open a terminal in the logo-motion folder.
3. Run: npm run dev
4. Open http://localhost:4173

Use a local server rather than opening index.html directly, because the app loads JavaScript modules and a tracing worker.

## Deploy

Upload the contents of dist/ to any static web host. There is no build step.

## Files

- dist/: complete website source and SVG assets
- scripts/preview.mjs: local preview server
- tests/motion.test.mjs: animation and tracing regression tests

Run tests with: node --test tests/motion.test.mjs

## Settings

Defaults: original artwork reveal, round caps, 100% curve softness, 1.55-second duration, 5% letter overlap, left-to-right order, gentle start and finish.

Projects and settings save in the browser's local storage. Browser-saved custom projects are not included in this ZIP.

Source snapshot: 80ec5b880834a32ef84cd386d52aa00ff975962c
