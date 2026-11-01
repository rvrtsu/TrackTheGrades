# Gradely (PWA)

Files: `index.html`, `app.js` (compiled app), `config.js` (**your database URL**), `manifest.json`, `sw.js` (offline cache), `icons/` (tiger logo + home-screen icons), `src/app.jsx` (readable source).

## What's new in this version (v37, step 1: themes, Quick actions, tiger watermark)
- **Color and Mode are separate.** The theme picker (Home > Themes, and Profile > Settings > Appearance) now has a **Color** row (Yellow, Maroon, Pink, Lavender, Mint and the new **Brown**) and a **Light / Dark** switch. Every color has a light and a dark version, so changing one never changes the other. The saved value is still a single theme id (`gtf-theme`), so existing installs keep their look. Devices that had the older Blue, Green or Classic themes keep them until a new color is picked.
- **Off-white Light mode.** No light theme uses pure white for the page or the cards any more. Each one is a very faint tint of its own accent (warm for Yellow and Brown, cool for Lavender and Mint, rosy for Pink and Maroon). All tokens live at the top of `index.html`.
- **Quick actions carousel.** Order: Dark/Light toggle, How it works, Join with code, Themes, Sync now, Reset Site Data, Report a problem (Install app is added last when the app is not installed). It no longer scrolls natively: the chips are measured, grouped into pages that fit, and the **left / right arrows** (or a swipe) fade and slide between pages. If everything fits, the arrows disappear. The arrows are flush with the card edges and the card clips its content, so hover states follow its curve. Styles are the `.qa-*` classes in `index.html`; the logic is `QuickCarousel` in `src/app.jsx`.
- **Reset Site Data.** Asks twice, then clears this site's saved data on the device (local storage, session, offline cache, service worker and IndexedDB) and reloads. Cloud accounts are not touched and can be signed in to again; anything saved only on the device is lost.
- **Tiger watermark.** A cartoon tiger head, drawn as a white translucent outline, peeks from the top-right corner of the Gradely title card (`TigerWatermark`, `.tiger-wm`). It sits behind the text and the title row is sized so it never meets the intro text, from 320px wide up.
- **Meet the creators** at the bottom of Home is now a quiet text link (no photos). It opens the same pop-up.
- Service worker cache is `gradely-v37-step1`. Open the app twice on each device so the update loads. The Tracker and sign-in logic are unchanged in this step.

## Previous version
### Earlier (v36 final: compact Home and tutorial fix)
- **Tutorial buttons.** **How it works** on Home opens the original welcome tour (the carousel that ends with Meet the Creators). The Home header no longer has a Tracker tutorial button. The Tracker tutorial opens only from inside the **Tracker** tab (**Replay Tutorial**), from **Profile > Settings > Tutorial**, and by itself the first time you visit the Tracker.
- **Meet the Creators pop-up.** On Home it is now a slim card. Tapping it opens a centered pop-up dialog with a fade and scale animation (close with the X, the Close button, a tap outside, or Escape).
- **Compact Home.** Smaller paddings, margins and type on every Home card, panel and heading, with no dead space.
- **Two cards per row.** Account and group cards use a two-column grid (`.g2` in `index.html`: `grid-template-columns: repeat(2, 1fr); gap: 10px`), on Home and inside a group.
- **Slim Quick actions.** Quick actions are a separate, very slim card directly under the title card: **How it works**, **Join with code**, **Report a problem**, **Sync now** (plus **Themes** and **Install app** when available) in one horizontal, scrollable row with hidden scrollbars.
- **Smooth transitions.** Collapsible areas (`.acc`) and the Creators dialog use `transition: all .3s ease-in-out`.
- Service worker cache is `gradely-v36-final`. Open the app twice on each device so the update loads.

## Earlier (v36, step 2: tutorial, cleanup and recovery)
- **Interactive Tracker tutorial.** A swipeable, six-slide walkthrough built on **sample subject cards** (it never reads or writes your real account). It shows how to switch subjects (swipe, tap the arrows, or use the arrow keys), add scores (the percent and grade update as you type), open **Options** (the Subject, Grading System, Base Configuration and Forecasting bubbles) and use the **Reverse Calculator**. It opens by itself the first time you visit the Tracker (remembered per device) and can be replayed from **Profile › Settings › Tutorial** and the **Replay Tutorial** button at the top of the Tracker tab. The original welcome tour is still there as **Replay welcome tour**. The older one-off Tracker tips are retired because the tutorial covers them.
- **Changelog cleanup.** The update dialog and its **Previous updates** list now pass every note through a filter before it is shown. Any note (or whole version) that mentions developer sign-in, developer accounts, API keys, credentials or similar internal wording is hidden, so future release notes can never expose developer details to students. The filter lives next to `RELEASE_NOTES` in `src/app.jsx` (`DEV_TRACE`). Old notes that named the developer account were also removed from the source.
- **No hardcoded developer login.** The developer username, email and password were removed from the app, the update notes and this README. The dashboard relies strictly on a Firebase Authentication session: you sign in with the email and password of your own Firebase user (Part 4) and the header simply reads **Developer session**. Nothing in the app checks a fixed name; Firebase and your database rules decide who the developer is.
- **Undo, Redo and Recently deleted (developer dashboard).** The dashboard has **Undo** and **Redo** buttons (also **Ctrl/Cmd+Z** and **Ctrl/Cmd+Shift+Z**, or **Ctrl+Y**; they are ignored while you type in a text box). Every change is recorded: edits, join codes, admins, members, deletes and report status. Undoing an edit only puts back the fields you changed, so it never overwrites grades a student saved meanwhile. **Recently deleted** keeps deleted groups, accounts, members, join codes and reports (latest 30, up to 30 days) with a one-tap **Restore**. The copy is saved in your database under `devtrash` and `devtrashidx` (only the developer can read them; the existing developer rule already covers it, so no new rules are needed). If that save fails, the item is kept in **session memory** and marked "this session only", and Undo/Redo keep working locally. Signing out clears session memory.
- Service worker cache is `gradely-v36`. Open the app twice on each device so the update loads.

### Earlier (v36, step 1: Home redesign)
- **Home header.** The flush app bar is now a standalone, curved card that matches the rest of the app. The logo is gone from Home; a large, centered **Gradely** title leads, followed by a short intro ("Track, forecast, and ace your grades effortlessly...") and a small sync status chip. **How it works**, **Join with code** and **Report a problem** (plus **Sync now**, **Themes** and **Install app** when available) now sit inside a collapsible **Quick actions** menu in the card. It scrolls with the page instead of staying fixed.
- **Profiles first.** Home now opens with a **Profiles** panel (subtitle plus **Sign In** and **Create Account** in its heading), a divider, then a **Your groups** panel (subtitle plus **Join Group** and **Create Group** in its heading). The old "Add a group or account" block, the **How this app works** link and the bottom **Report a Problem** button are gone, because the header and the panel headings already hold them. Account and group cards sit two per row on phones. The **Profiles** and **Your groups** descriptions show in full when no account is on this device; once you are signed in they fold away behind a small **View more** toggle. Headings, cards and empty states are centered with more whitespace.
- **Groups follow your account.** Sign In now works straight from Home (no group needed). Each cloud account document stores the list of groups it belongs to (a small `g` field next to `t`, `d`, `n`, `e`, `p`, `b`), so signing in on any device adds all of them to **Your groups** automatically. Devices that already have the account pick up groups added elsewhere the next time they sync. It only ever adds groups; nothing is removed from another device. **The Firebase rules do not need to change** (the existing `$other` rule already allows the new field), and older accounts gain the field the next time they join or leave a group.
- Panel styles (`.panel`, `.panel-hd`) live in `index.html`. Service worker cache was `gradely-v36-step1`.

### Earlier (v31)
- **Home header redesign.** The pill is replaced by a flush, full-width Material-style app bar (soft translucency, slight tint, elevation, no glow). It is large at the top of the page (big icon, divider, **Gradely** and the tagline) and condenses as you scroll, swapping the tagline for your sync status. A quick-action row holds **How it works** (tutorial), **Join with code**, **Install app** (when not installed) and **Report a problem**; Refresh and Theme are icon buttons. It keeps clear of the notch and Dynamic Island. Service worker cache is `gradely-v31`.

### Earlier (v29)
- **New home header.** The top of the home screen is now a floating glass pill: tiger icon, a hairline divider, **Gradely** and the tagline "Track, Forecast, and Ace your Sem". It sticks below the status bar and respects the notch and Dynamic Island (safe-area inset, with a 3rem minimum when installed on a phone).
- Service worker cache is `gradely-v29`.

### Earlier (v28)
- **Cloud only.** The "local only" account and group options are gone. Every new group and account is created in your Firebase database. Older accounts and groups that were saved only on a device still open; edit them on the home screen and use **Move to the cloud** to keep them.
- **Join with a code.** Every new group gets a short 6-character code (for example `K7M-Q2X`). Tap **Join Group** on the home screen and type it to join instantly. The group screen shows the code with **Copy code** and **Copy invite link** (the link opens the join box with the code filled in). Admins can make a new code from Edit group. Older groups show **Generate join code** to admins.
- **Creator = admin.** Creating a group also creates (or reuses) your account and makes it the group admin. There is no separate admin account to set up.
- **Themes.** **Yellow Dark** is the default for new installs (devices that already picked a theme keep it). Red is now a deeper **Maroon**. **Pink**, **Lavender** and **Mint** are new, each with a Light and a Dark version. The theme picker groups them by colour.
- **Report a Problem.** A button on the home screen sends a bug report to `reports/` in your database.
- **Developer dashboard.** Sign in from the small **Developer sign-in** link with your Firebase developer user. The dashboard lists bug reports (status, notes, delete), groups (rename, join code, members, admins, delete) and accounts (name, bio, raw data, delete). See **Part 4**. **You must publish the new rules in Part 1 and do Part 4 for it to work.**
- **UI.** **Hide Prelim Grades** now appears only in the report card export. **Meet the Creators** on the home screen is a large collapsible card. The Tracker has a small **Replay Tutorial** button.
- Service worker cache is `gradely-v28`. Open the app twice on each device so the update loads.

### Earlier (v23)
- **No more lock screen media controls.** The sound engine is removed completely: no hidden `<audio>` element (the silent-WAV trick), no `navigator.audioSession`, no Web Audio context, and no media session. iOS no longer sees the app as an audio source. The "Sound effects" switch and "Play test sound" button are gone from Settings; haptics (vibration) and confetti stay.
- **Home button in the Tracker header.** A 40x40 house icon sits beside the year/semester pill and returns to the Overview tab. The pill truncates long names, and on screens under 360px the side buttons shrink slightly so nothing squeezes.
- Release notes and update dialog list both changes. Service worker cache is `gtf-v23`. Calculation logic is unchanged.

### Earlier (v22)
- **Base check.** The Base value and the At the end / Per term switch were audited end to end (input, saved subject, semestral math, breakdown, Report, forecaster). With valid scores and a Base the formulas run correctly in both modes (for example Prelim 80, Final 90, 40/60, Base 50 gives 93).
- **Per term is now visible.** In Per term mode the Tracker's Prelims and Finals cards show each period grade after Base (80 shows as 90, with "After Base · raw 80"). Both modes still reach the same semestral grade because the formula is linear and weights are scaled to 100%.
- "Fixed Base grade calculation" added to the release notes. Service worker cache is `gtf-v22`.

### Earlier (v21)
- **Tracker blank-screen fix.** The v20 edit accidentally removed three Tracker functions (`Options`, `Reverse`, `PeriodBlock`), so opening the Tracker crashed. They are restored, and the whole file was scanned for any other undefined names.
- **Safer grade math.** Same formulas, but every step now tolerates missing subjects, periods, activities and NaN values (`null` instead of a crash). A period with no scores shows a dash on the Tracker cards too.
- **Error boundary.** Each tab (and the app as a whole) is wrapped, so a failure shows "Failed to load this section" with **Try again** and **Reload app** instead of a white screen.
- **Required update dialog.** A new version now opens a full-screen blocking dialog (`z-[9999]`) with release notes and a single **Refresh & Update Now** button. There is no close button, and tapping outside or pressing Escape does nothing. Edit the `RELEASE_NOTES` array in `src/app.jsx` for each release.
- Service worker cache is `gtf-v21`. The Firebase rules do not need to change.

### Earlier (v20)
- **Base application toggle (per subject).** In a subject's Options, directly beside the Base box, choose **At the end** (default) or **Per term**.
  - *At the end:* Raw Combined = (Prelim × Prelim weight) + (Final × Final weight), then Final Semestral = (Raw Combined / 100) × (100 − Base) + Base.
  - *Per term:* Transmuted Prelim = (Prelim / 100) × (100 − Base) + Base, the same for Finals, then Final Semestral = (Transmuted Prelim × Prelim weight) + (Transmuted Final × Final weight).
  - The choice is saved per subject (`bmode`) and syncs with the account. Period weights are still scaled to 100%, as before. The Semestral breakdown in Options shows the working for the selected method.
- **Blank grading periods stay blank.** A period with no scores entered at all (Prelims or Finals) now shows a dash on the Report Card and is left out of the GWA, instead of showing 5.00. Once at least one score is entered in a period, blank activity rows inside it still count as 0. The Finals (semestral) column needs every period to have at least one score.
- Service worker cache is `gtf-v20`. The Firebase rules do not need to change.

### Earlier (v18)
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

**Important:** (this note is from an older version) the Firebase rules above do not need to change. Changing an account or group passcode moves its cloud copy to a new key, so other devices must remove that account (or rejoin that group) and unlock it again with the new passcode.

## Part 1: Create the free database (about 5 minutes)
1. Go to **console.firebase.google.com**, click **Create a project**, turn Google Analytics off.
2. **Build → Realtime Database → Create Database** (pick **Singapore**), start in **locked mode**.
3. Open the **Rules** tab, replace everything with this, and click **Publish**. Replace `PASTE_YOUR_DEVELOPER_UID` with the **User UID** of your developer user from Part 4 (skip Part 4 for now and the two developer lines simply match nobody). If you published the older rules that matched an email address, they keep working; switch to the UID version whenever it suits you (**v28 adds `codes`, `reports` and the two developer lines at the top**, so republish even if you already have older rules):

```json
{
  "rules": {
    ".read": "auth != null && auth.uid == 'PASTE_YOUR_DEVELOPER_UID'",
    ".write": "auth != null && auth.uid == 'PASTE_YOUR_DEVELOPER_UID'",
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
    },
    "codes": {
      "$code": {
        ".read": true,
        ".write": true,
        ".validate": "$code.length == 6 && newData.hasChildren(['k'])"
      }
    },
    "reports": {
      "$id": {
        ".write": "!data.exists() && newData.exists()",
        ".validate": "newData.hasChildren(['t','m']) && newData.child('m').isString() && newData.child('m').val().length < 2000"
      }
    }
  }
}
```

**What these rules do:** students can only reach a group, account or join code if they know its key or code, exactly as before. The two new top rules let only the developer user (Part 4) list and change everything. Anyone can *send* a bug report, but only the developer can read, change or delete reports. (`codes` is open like `groups`, so a person who knows a code can use it. Admin rights are enforced by the app, not the database, as noted in v18.)

4. On the **Data** tab copy the database URL (like `https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app`).

## Part 2: Put the URL in the project
Open `config.js`, replace the placeholder URL (keep the quotes), then upload **every file in this folder** to your GitHub repository (replace the old ones, keep `icons` and `src`). Wait about a minute, then open the app twice on each device so the new version loads.

## Part 3: Use groups and accounts
- **Create a group:** home screen → **Create Group** → name, icon or picture, a **group passcode**, and your own name and **account passcode** (or pick an account already on the device). You become the admin automatically, and the group gets a **join code**.
- **Join a group:** home screen → **Join Group** → type the 6-character code (or open an invite link). Its accounts appear as 🔒 cards; tap one and enter that account's passcode to unlock it, or use **New Account** to add yours. No code? Use the group name and passcode link in the same box.
- **Create an account:** open the group → **＋ New Account** → name, bio, picture and an **account passcode**. It is saved to the cloud.
- **Privacy:** a group only lists cards (name, bio, picture, sync name). Account grades stay behind each account's own passcode. Use long passcodes.

## Part 4: Developer dashboard (one-time setup)
The dashboard needs Firebase Authentication so only the developer can read every group and account. No developer name, email or password is stored in the app: Firebase checks the sign-in, and your database rules decide who counts as the developer.
1. Firebase console → **Build → Authentication → Get started → Sign-in method** → turn on **Email/Password**.
2. **Users → Add user**: use an email address you own and a strong password of your choice. Copy the user's **User UID** from the Users table.
3. Back in **Realtime Database → Rules**, paste that UID in place of `PASTE_YOUR_DEVELOPER_UID` (Part 1) and **Publish**.
4. **Project settings → General** → copy the **Web API key** and paste it between the quotes after `apiKey` in `config.js`.
5. Optional but recommended: **Authentication → Settings → User actions** → turn off **Enable create (sign-up)**, so nobody else can register users. In Google Cloud, you can also restrict the API key to your website address.
6. Open the app → **Developer sign-in** (bottom of the home screen) → enter your developer email and password. The session is remembered on that device until you tap **Sign out**, and the dashboard header shows **Developer session**.

**Undo and recovery.** The dashboard toolbar has **Undo**, **Redo** and **Recently deleted** (see "What's new" above). Restoring a deleted account puts its cloud copy back; a device that already removed it can get it again by signing in with its passcode.

Deleting an account from the dashboard leaves a small marker so other devices drop the account instead of uploading it again.

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
   `npx esbuild src/app.jsx --bundle --minify --loader:.jsx=jsx --define:process.env.NODE_ENV='"production"' --target=es2018 --outfile=app.js` (or just `npm run build` with the included `package.json`)
2. Raise the `CACHE` number in `sw.js`, upload the changed files. Devices that already run the app show the "Update Available! Tap to refresh" banner; tap it to load the new version.

## Install
iPhone/iPad (Safari): Share → **Add to Home Screen**. Android (Chrome): menu → **Install app**. Mac: Safari File → **Add to Dock**.
