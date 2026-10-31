# Grades Tracker and Forecaster (PWA)

Files: `index.html`, `app.js` (compiled app), `config.js` (**your database URL**), `manifest.json`, `sw.js` (offline cache), `icons/` (tiger logo + home-screen icons), `src/app.jsx` (readable source).

## What's new in this version (v18)
- **Group admins.** The person who creates a group is its admin. Only admins see **Group passcode** (including the recovery email) and the new **Manage members** section in Profile and Settings. In Manage members an admin can make a member an admin, remove admin access, step down, or **transfer adminship** (a second "Final warning" step confirms the transfer). A group always keeps at least one admin, and the last admin cannot step down. The cloud copy of a group stores its admins at `groups/<key>/admins`, so every device agrees, and each change re-reads the newest list from the cloud first. Only admins see the cloud-wide "Delete group from the cloud too" button on the home screen.
  - *Groups that already existed:* the first account that opens the group after this update becomes its admin (a device that joined the group never claims it). If that is the wrong person, they can transfer adminship from Manage members.
  - *Honest limit:* the database rules in Part 1 are open (anyone with the group's link can write), so admin rights are enforced by the app, not by the database. This is fine for a classmates' group. Real server-side enforcement would need Firebase Authentication.
- **Double confirmation for every delete.** Deleting a group, account, subject, year, semester, grading period, activity or grade-table row, clearing scores, clearing the past record and removing a picture all open a confirmation dialog first. Nothing deletes on a single tap. Cloud-wide deletes (group for everyone, account from the cloud) and adminship transfer add a second **Final warning** step. Escape or Cancel always backs out.
- **Blank scores count as 0.** An activity that has a weight but no score is treated as a score of 0 in every grade, GWA and report, and its weight stays in the total. Activities show "blank · counts as 0". The Forecaster still treats blank scores as the open slots it solves for, so "what do I need on the rest" keeps working.
- **Welcome tour.** A five-step Apple-style carousel (swipe, arrow keys or Next) opens once on a brand-new install. It covers groups, accounts, subjects and activities, and tracking and forecasting. Devices that already have accounts do not see it. Replay it from Profile and Settings (Replay tutorial) or from the home screen (How this app works).
- Service worker cache is `gtf-v18`. The Firebase rules do not need to change.

### Earlier (v18 part 2)
- **Multiple groups per account.** One account can now belong to several groups at the same time. Add it to more groups from Edit account (tick the groups), from a group's "or add an existing account" link, or from the new switcher. Unlocking or signing in to an account that is already on the device from a second group adds that group instead of moving the account. Cloud group directories list the account in every cloud group it belongs to. Removing a group only removes that membership; an account keeps its other groups.
- **Group and account switcher (no sign-out).** The button at the top right of the app now opens a sheet with your joined groups (tap one to make it the active group), the accounts in the active group (tap to switch account), an "Add" button for groups the account is not in yet, and "All groups and accounts" to go back to the home screen. The Profile tab shows the active group, and the group passcode settings follow the active group.
- **Persistent login.** The signed-in state, the active account id and the active group id are saved in `localStorage` (`gtf-session`, plus `gtf-auth`, `gtf-active-account`, `gtf-active-group`). On every open, refresh or update the exact session is restored and the home screen is skipped. The last tab you used is restored too. The session is cleared only when you tap "All groups and accounts" (or remove the account). The app also asks the browser for persistent storage so the saved data is not evicted.
  *Note on Firebase Auth:* this app talks to the Realtime Database over REST with passcode-hashed keys and does not load the Firebase Auth SDK, so there is no `setPersistence()` call to make. The saved session above is the equivalent of `browserLocalPersistence` (it is tagged `persistence: "browserLocalPersistence"` in the stored session).
- **PWA auto-update.** A new service worker now installs quietly and waits. The app detects it and shows an **"Update Available! Tap to refresh"** banner. Tapping it sends `SKIP_WAITING`, the new worker calls `self.skipWaiting()`, and the page reloads once on `controllerchange` with the newest files, with your session intact. The app also checks for updates when it is reopened, when the device comes back online and every 20 minutes. The worker installs with `cache: 'reload'` so it never caches stale files. Service worker cache is `gtf-v18-part2`.
- **One-time transition:** devices still running the old v18 part 1 worker pick this version up the usual way (open the app twice). From then on updates use the banner.
- Grade formulas, Firebase sync, passcodes and Firebase rules are unchanged (the rules do not need to change).

### Earlier (v18 part 1)
- **Collapsible grade format (Report tab).** The Prelims and Finals switches (5-Point Scale or Percentage) now live in a slim "Grade format" row that expands on tap. Its subtitle always shows the current choice, so the top of the report card stays clean.
- **Buttery subject swipes (Tracker).** Only the card body moves, while the subject tabs stay put. The card follows your finger, glides out and the next subject glides in using transform and opacity only (GPU accelerated, `will-change`), with an iOS-style ease-out. Edges rubber-band and bounce back, rapid taps retarget instead of stacking, and reduced-motion is respected.
- **Manage years and semesters.** Profile and Settings, Years and semesters, now has an "Order and removal" list: move any year or semester up or down (rows glide to their new place) and delete one with a confirmation. At least one year, and one semester per year, is always kept. Deleting is undoable with Undo. A "Reorder or delete…" shortcut is also in the year and semester dropdown at the top.
- Grade formulas, Firebase sync, passcodes, groups and rules are unchanged. Service worker cache is `gtf-v18-part1`.

### Earlier (v17)
- **Compact Overview.** Past record and Target GWA now sit inside the Cumulative All-Year GWA card as slim accordions. The greeting, All-Year card and the Prelims and Finals GWA cards fit on one phone screen, and the Prelims and Finals cards stay side by side.
- **Compact subject cards.** Overview subject cards are one slim row each with Prelims and Finals visible immediately. In the Tracker the Prelims, Finals and Semestral cards are one row (the semestral card still leads with the grade equivalent and shows the percentage under it).
- **Activity editor fixed on phones.** The activity name shrinks, and the weight box, the % sign and the remove button always stay on screen (tested down to 320 px wide).
- **Report tab: independent formats.** Prelims and Finals each have their own switch: 5-Point Scale or Percentage. You can show Prelims as percentages and Finals as grades, or the other way round. The GWA totals follow each column (in Percentage mode they show the unit-weighted average percentage). The choice is remembered on the device. On a percentage-scale profile only percentages are shown.
- **Export as Image has 4 designs:** Minimalist Light, Premium Dark, Classic Academic and Current theme (your app colours). Pick one in the export sheet and the preview updates. The export uses the same column formats and decimals as the Report tab.
- **New default grade table** (used by every new account, group and subject, and by any account that has not edited its own table): 96 = 1, 94 = 1.25, 92 = 1.5, 89 = 1.75, 88 = 2, 84 = 2.25, 82 = 2.5, 78 = 2.75, 75 = 3. Accounts that saved their own custom table keep it. To switch an existing account to the new table: Profile and Settings, Highest possible grade, Reset to preset.
- **GWA decimals.** Every GWA now shows 3 decimals by default (for example 1.664). Choose 2, 3 or 4 in Profile and Settings, GWA decimal places. The choice is saved with the account. Single subject grades (1.75, 2.25) still show 2 decimals.
- Grade formulas, Firebase sync, passcodes and groups are unchanged, and the Firebase rules do not need to change.

### Earlier (v16)
Soft glass look, centred homepage, Report tab, Forecast tab removed, Overview holds all GWA metrics, collapsible Profile and Settings.

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
3. In `sw.js` raise the cache number (for example `const CACHE = 'gtf-v18'` to `'gtf-v19'`) so devices download the new icons.
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
2. Raise the `CACHE` number in `sw.js`, upload the changed files. Devices that already run the app show the "Update Available! Tap to refresh" banner; tap it to load the new version.

## Install
iPhone/iPad (Safari): Share → **Add to Home Screen**. Android (Chrome): menu → **Install app**. Mac: Safari File → **Add to Dock**.
