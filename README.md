# Grades Tracker and Forecaster (PWA)

Files: `index.html`, `app.js` (the compiled app), `manifest.json`, `sw.js` (offline cache), `icons/`, and `src/app.jsx` (readable source).

## Host it free

### Option A: GitHub Pages
1. Create a free account at github.com, then **New repository** (name it e.g. `grades`, set it to Public).
2. Click **uploading an existing file** and drag in `index.html`, `app.js`, `manifest.json`, `sw.js`, the `icons` folder and `src`. Click **Commit changes**.
3. Go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, then **Save**.
4. Wait about a minute. Your link will be `https://YOUR-USERNAME.github.io/grades/`.

### Option B: Cloudflare Pages
1. Create a free account at dash.cloudflare.com.
2. Go to **Workers & Pages → Create → Pages → Upload assets**, name the project and click **Create project**.
3. Drag in the unzipped folder (or the files above) and click **Deploy site**.
4. Your link will be `https://PROJECT-NAME.pages.dev`.

## Install on your devices
Open your link, then:
- **iPhone/iPad (Safari):** Share button → **Add to Home Screen** → Add.
- **Android (Chrome):** ⋮ menu → **Install app**.
- **Mac (Safari):** File → **Add to Dock**. **Chrome:** the install icon in the address bar.

Open it once while online so it can cache everything. After that it works offline and opens without a browser bar.

## Your data
- It saves automatically in that device's browser storage. Each device keeps its own copy, so the iPad and MacBook do not sync.
- Use **⚙ Manage → Export data** to download a backup and **Import data** to restore it or move it to another device.
- Export a backup every now and then in case the browser clears its storage.

## Updating the app
1. Edit `src/app.jsx` and rebuild: `npm install esbuild react react-dom` then
   `npx esbuild src/app.jsx --bundle --minify --loader:.jsx=jsx --define:process.env.NODE_ENV='"production"' --target=es2018 --outfile=app.js`
2. In `sw.js`, change `const CACHE = 'gtf-v1'` to `'gtf-v2'` (and so on) so devices download the new version.
3. Upload the changed files again. Close and reopen the app once or twice to get the update.
