# Grades Tracker and Forecaster (PWA)

Files: `index.html`, `app.js` (compiled app), `config.js` (**your database URL**), `manifest.json`, `sw.js` (offline cache), `icons/` (tiger logo + home-screen icons), `src/app.jsx` (readable source).

## What's new in this version (v10)
- **Redesigned startup screen** with Create group and Join group cards, soft gradients and glass surfaces.
- **Floating bottom navigation**: Overview, Tracker, Forecaster, Profile, Settings. The old top toggle bars are gone and the app uses SVG icons instead of emojis.
- **Overview dashboard** (the default view): Overall GWA, a separate **Majors GWA**, target, bottom line and a widget per subject. Multi-column on iPad and desktop.
- **Major / Gen Ed tag** on every subject (set when adding, or on the subject card).
- **Subject cards**: period grades and the semestral grade sit at the top. Period weights, Base, retention and the reverse calculator are inside a collapsed **Options** panel. The preset buttons are gone; use the text fields.
- **Base curve only on the semestral grade**. The semestral projection is hidden while the Prelims tab is open.
- **Profile tab**: change name, picture, account passcode and group passcode. The group creator can set a **recovery email**; the unlock screen shows a Forgot passcode link that opens an email to it.
- **Info tooltips** (the small i icons) explain the main inputs.
- **Story export (9:16)**: Share on Overview or Forecaster builds a glass-style image with a Hide raw scores switch.
- **Themes**: Yellow, Blue, Red and Green in Light and Dark, plus Monochrome and Lavender.
- **Blank slate**: no preset subjects and no suggested names. Existing saved data is untouched.

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
3. In `sw.js` raise the cache number (`const CACHE = 'gtf-v10'` to `'gtf-v11'`) so devices download the new icons.
4. Upload, then on each device **delete the old Home Screen icon and add it again** (iPhone/iPad: Share → Add to Home Screen; Android: Install app). iOS keeps the old icon until you re-add it.

**Inline SVG for the UI** (this is the `TigerLogo` component in `src/app.jsx`; paste this anywhere in HTML and size it with CSS):

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="64 90 384 372"><defs><linearGradient id="tf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD84A"/><stop offset="1" stop-color="#F5B400"/></linearGradient><radialGradient id="bg" cx="30%" cy="12%" r="95%"><stop offset="0" stop-color="#FFF6CC"/><stop offset="1" stop-color="#FFFFFF"/></radialGradient></defs><g>
  <!-- ears -->
  <circle cx="148" cy="150" r="46" fill="url(#tf)"/>
  <circle cx="364" cy="150" r="46" fill="url(#tf)"/>
  <circle cx="150" cy="154" r="22" fill="#FFF3C4"/>
  <circle cx="362" cy="154" r="22" fill="#FFF3C4"/>
  <!-- head -->
  <path d="M256 126C334 126 398 164 414 232C420 258 420 282 414 304L434 342L398 338C388 366 372 392 344 412C316 432 286 440 256 440C226 440 196 432 168 412C140 392 124 366 114 338L78 342L98 304C92 282 92 258 98 232C114 164 178 126 256 126Z" fill="url(#tf)" stroke="url(#tf)" stroke-width="6" stroke-linejoin="round"/>
  <!-- forehead stripes -->
  <path d="M256 146L268 160L262 214L256 224L250 214L244 160Z" fill="#2A2204"/>
  <path d="M212 158Q226 186 232 216" stroke="#2A2204" stroke-width="13" stroke-linecap="round" fill="none"/>
  <path d="M300 158Q286 186 280 216" stroke="#2A2204" stroke-width="13" stroke-linecap="round" fill="none"/>
  <!-- cheek stripes -->
  <g stroke="#2A2204" stroke-width="13" stroke-linecap="round" fill="none">
    <path d="M108 250Q142 254 168 274"/><path d="M110 292Q142 294 170 308"/><path d="M132 332Q152 332 176 342"/>
    <path d="M404 250Q370 254 344 274"/><path d="M402 292Q370 294 342 308"/><path d="M380 332Q360 332 336 342"/>
  </g>
  <!-- muzzle -->
  <path d="M256 316C292 316 324 336 324 368C324 398 292 414 256 414C220 414 188 398 188 368C188 336 220 316 256 316Z" fill="#FFFFFF"/>
  <!-- eyes -->
  <path d="M178 244Q212 234 244 264Q208 276 178 244Z" fill="#2A2204"/>
  <path d="M334 244Q300 234 268 264Q304 276 334 244Z" fill="#2A2204"/>
  <circle cx="219" cy="254" r="4.5" fill="#FFF3C4"/><circle cx="293" cy="254" r="4.5" fill="#FFF3C4"/>
  <!-- nose + mouth -->
  <path d="M236 332H276L256 358Z" fill="#2A2204" stroke="#2A2204" stroke-width="9" stroke-linejoin="round"/>
  <path d="M256 360V378M256 378Q238 394 220 384M256 378Q274 394 292 384" stroke="#2A2204" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</g>
</svg>
```

(The mark is an original design inspired by the UST Growling Tigers, not the official university logo.)

## Update the app yourself
1. Edit `src/app.jsx`, then run `npm install esbuild react react-dom` and
   `npx esbuild src/app.jsx --bundle --minify --loader:.jsx=jsx --define:process.env.NODE_ENV='"production"' --target=es2018 --outfile=app.js`
2. Raise the `CACHE` number in `sw.js`, upload the changed files.

## Install
iPhone/iPad (Safari): Share → **Add to Home Screen**. Android (Chrome): menu → **Install app**. Mac: Safari File → **Add to Dock**.
