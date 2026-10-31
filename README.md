# Grades Tracker and Forecaster (PWA)

Files: `index.html`, `app.js` (compiled app), `config.js` (**your database URL**), `manifest.json`, `sw.js` (offline cache), `icons/` (tiger logo + home-screen icons), `src/app.jsx` (readable source).

## What's new in this version (v12)
- **Clean header**: one large title (for example "2nd Year - 1st Semester", taken from Settings) and a cloud icon on the top right. A small check inside the cloud means everything is synced; tap it to sync now. Undo and Redo moved to **Settings → Data**, and the Year/Semester pickers live in **Settings → Years and semesters**.
- **No clipped text, no zoom**: info tooltips now float above everything and stay inside the screen. Tracker cards have more padding and spacing. Every text field and dropdown is exactly 16px, so Safari on iPhone no longer zooms in when you tap to type. Subject code, name and units are edited in **Options → Subject details**.
- **Accents follow your theme**: subject icons, badges and highlights now use the selected theme colour instead of fixed blue, green or purple.
- **Quiet, elegant sound**: soft bell tones with a gentle room tail, only when a calculation finishes ("Fill possible scores"), when it is not possible, and when your projection reaches the target. Typing, taps and navigation are silent. Sound and haptics still have switches in Settings.
- **Simpler Forecaster**: the Bottom line text and the Max, Survival and Excellence buttons are gone. You get the manual inputs, the sliders and "Set missing to needed".
- **Overview shows actual grades only**: a **Prelims GWA** section (recorded Prelims grades only) and a **Finals GWA** section (Prelims + Finals combined, only for subjects with every period recorded), each with an Overall and a Majors GWA. No targets, projections or warnings. The Share image from Overview follows the same rule; the Share image from the Forecaster still shows the projection.
- **New logo**: a tiger paw whose main pad is an open book, framed by tiger stripes (replaces the old tiger face). All home-screen icons were regenerated.
- Everything else (formulas, Firebase sync, passcodes, groups) is unchanged.

**Important:** the Firebase rules above do not need to change. Changing an account or group passcode moves its cloud copy to a new key, so other devices must remove that account (or rejoin that group) and unlock it again with the new passcode.

## Part 1: Create the free database (about 5 minutes)
1. Go to **console.firebase.google.com**, click **Create a project**, turn Google Analytics off.
2. **Build → Realtime Database → Create Database** (pick **Singapore**), start in **locked mode**.
3. Open the **Rules** tab, replace everything with this, and click **Publish** (**the `groups` part is new**, add it even if you already have the `sync` rules):

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "sync": {
      "$key": {
        ".read": true,
        ".write": true,
        ".validate": "$key.length == 64 && newData.hasChildren(['t','d'])",
        "t": { ".validate": "newData.isNumber()" },
        "d": { ".validate": "newData.isString() && newData.val().length < 900000" },
        "$other": { ".validate": true }
      }
    },
    "groups": {
      "$key": {
        ".read": true,
        ".write": true,
        ".validate": "$key.length == 64"
      }
    }
  }
}
```

4. On the **Data** tab copy the database URL (like `https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app`).

## Part 2: Put the URL in the project
Open `config.js`, replace the placeholder URL (keep the quotes), then upload **every file in this folder** to your GitHub repository (replace the old ones, keep `icons` and `src`). Wait about a minute, then open the app twice on each device so the new version loads.

## Part 3: Use groups and accounts
- **Create a group:** home screen → **＋ Create New Group** → name, icon or picture, and a **group passcode** (keep "Sync this group to the cloud" on).
- **Create an account:** open the group → **＋ New Account (cloud)** → name, bio, picture and an **account passcode**.
- **Another device:** home screen → **Join an existing group**, enter the group name and passcode. Its accounts appear as 🔒 cards; tap one and enter that account's passcode to unlock it. After that it is on your home screen for good.
- **Privacy:** a group only lists cards (name, bio, picture, sync name). Account grades stay behind each account's own passcode. Use long passcodes.

## Tiger logo and home-screen icon
Files (already in `icons/`): `tiger.svg` (vector), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180), `favicon-32.png`.

**To change or refresh the icon:**
1. Replace the PNG files in `icons/` with your new artwork using the **same file names and sizes** (192, 512, 512 with ~20% padding for *maskable*, and 180 with no transparency for `apple-touch-icon.png`). To re-export from the SVG: `npx sharp-cli -i icons/tiger.svg -o icons/icon-512.png resize 512` or any editor.
2. `manifest.json` already points to them, so no edit is needed unless you rename a file. If you do, update the `src` entries in the `icons` array and the matching `<link rel="apple-touch-icon">` / `<link rel="icon">` lines in `index.html`. Colours: `background_color` is `#FFFFFF`, `theme_color` is `#FACC15`.
3. In `sw.js` raise the cache number (`const CACHE = 'gtf-v12'` to `'gtf-v13'`) so devices download the new icons.
4. Upload, then on each device **delete the old Home Screen icon and add it again** (iPhone/iPad: Share → Add to Home Screen; Android: Install app). iOS keeps the old icon until you re-add it.

**Inline SVG for the UI** (this is the `TigerLogo` component in `src/app.jsx`; paste this anywhere in HTML and size it with CSS):

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Tiger paw and open book"><defs><linearGradient id="bg" x1="0.15" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#F59E0B"/></linearGradient><clipPath id="tile"><rect width="512" height="512" rx="116"/></clipPath></defs><rect width="512" height="512" rx="116" fill="url(#bg)"/><g clip-path="url(#tile)"><g fill="#2A1A05">
  <path d="M-10 96C64 100 120 124 160 168C108 148 46 142 -10 146Z"/>
  <path d="M-10 214C38 216 76 230 100 256C70 246 30 244 -10 248Z"/>
  <path d="M-10 330C34 334 62 348 80 372C54 364 24 362 -10 366Z"/>
  <path d="M522 96C448 100 392 124 352 168C404 148 466 142 522 146Z"/>
  <path d="M522 214C474 216 436 230 412 256C442 246 482 244 522 248Z"/>
  <path d="M522 330C478 334 450 348 432 372C458 364 488 362 522 366Z"/>
</g></g>
  <g transform="translate(0,-14)">
    <!-- toe pads -->
    <g fill="#2A1A05">
      <ellipse cx="126" cy="254" rx="30" ry="41" transform="rotate(-26 126 254)"/>
      <ellipse cx="204" cy="188" rx="33" ry="46" transform="rotate(-8 204 188)"/>
      <ellipse cx="308" cy="188" rx="33" ry="46" transform="rotate(8 308 188)"/>
      <ellipse cx="386" cy="254" rx="30" ry="41" transform="rotate(26 386 254)"/>
    </g>
    <!-- main pad = open book -->
    <g transform="translate(256 366) scale(1.1) translate(-256 -366)"><g fill="#FFF8E1" stroke="#FFF8E1" stroke-width="18" stroke-linejoin="round">
      <path d="M248 332C224 312 190 306 154 312V394C190 388 224 394 248 414Z"/>
      <path d="M264 332C288 312 322 306 358 312V394C322 388 288 394 264 414Z"/>
    </g>
    <g fill="none" stroke="#2A1A05" stroke-width="9" stroke-linecap="round">
      <path d="M176 340C196 337 218 340 234 350"/><path d="M176 364C196 361 218 364 234 374"/>
      <path d="M336 340C316 337 294 340 278 350"/><path d="M336 364C316 361 294 364 278 374"/>
    </g></g>
  </g></svg>
```

(The mark is an original design: a tiger paw whose main pad is an open book, framed by tiger stripes.)

## Update the app yourself
1. Edit `src/app.jsx`, then run `npm install esbuild react react-dom` and
   `npx esbuild src/app.jsx --bundle --minify --loader:.jsx=jsx --define:process.env.NODE_ENV='"production"' --target=es2018 --outfile=app.js`
2. Raise the `CACHE` number in `sw.js`, upload the changed files.

## Install
iPhone/iPad (Safari): Share → **Add to Home Screen**. Android (Chrome): menu → **Install app**. Mac: Safari File → **Add to Dock**.
