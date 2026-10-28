# Grades Tracker and Forecaster (PWA with cloud sync)

## What's new in this version
- **Back to Home:** a button that stays at the top of every profile.
- **One subject at a time:** the Tracker shows a single subject card. Swipe left or right (or use the tab bar, the arrows, or your keyboard's arrow keys) to change subject. Right below it sits the **Manual Automatic Calculator**, a scratchpad that never changes or syncs your saved data.
- **Dynamic grading:** set your own period weights (40 / 60, 50 / 50, or add more periods) in **⚙ Settings → Grading periods**. Every period has its own activities. Use **＋ Add Extra Activity** for participation, recitation, projects and so on, and give each a weight.
- **Base:** each period has a default Base, and any subject can override it. Transmuted grade = (Raw ÷ 100) × (100 − Base) + Base. The Forecaster runs the same formula backwards to tell you the score you need.
- **Summary:** text-only **Current Prelims GWA**, **Final / Projected GWA** and your **Dean's List target**, plus **Share / export as image** and a **Last synced** time.
- **Also included:** profile photos and groups, four themes, accordions in the Forecaster, a highest-grade setting (1.0, 4.0 or 100) with an editable grade table.
- **Your old data is upgraded automatically** the first time the new version opens. Update all your devices to this version so they speak the same format.

## Part 1: Create the free database (about 5 minutes)

1. Go to **console.firebase.google.com** and sign in with a Google account.
2. Click **Create a project**, name it (e.g. `grades-sync`), turn **Google Analytics off**, and click **Create project**.
3. In the left menu choose **Build → Realtime Database → Create Database**.
4. Pick a location (**Singapore** is closest to the Philippines), then choose **Start in locked mode** and click **Enable**.
5. Open the **Rules** tab, delete everything there, paste this, and click **Publish**:

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
    }
  }
}
```

6. Open the **Data** tab. At the top you will see your database URL, like
   `https://grades-sync-default-rtdb.asia-southeast1.firebasedatabase.app`. Copy it.

You do not need an API key for this app. The URL is the only thing to copy.

## Part 2: Put the URL in the project

1. Open `config.js` in the project (on GitHub: click the file, then the pencil icon).
2. Replace `https://YOUR-PROJECT-default-rtdb.firebaseio.com` with your URL, keeping the quotes:

```js
window.GTF_CONFIG = {
  databaseURL: "https://grades-sync-default-rtdb.asia-southeast1.firebasedatabase.app"
};
```

3. Upload or commit **every file in this folder** to your GitHub repository, replacing the old ones. Keep the `icons` and `src` folders.
4. Wait about a minute for GitHub Pages to update.
5. On each device, open the app, close it completely, and open it again so the new version loads.

## Part 3: Turn on syncing

**On your Mac (the device that already has your grades):**
1. On the home screen tap **✏️** on your profile, then under **☁ Cloud sync** type a sync name and passcode.
2. Use a **passcode** of 6+ characters (longer is safer) and tap **Turn on sync**.

**On your iPhone and iPad:**
1. On the home screen tap **☁ Add cloud profile**.
2. Enter the same sync name and passcode. Your grades appear and stay in sync.

The chip at the top of the app shows **☁ Synced**, **☁ Syncing…** or **📴 Offline · saved here**.

## How it works
- Changes upload a moment after you stop typing and appear on your other devices within a couple of seconds.
- Everything is also saved on the device, so you can view and edit offline. Offline edits upload when you are back online.
- If two devices edit while offline, the newest edit wins. The other version is kept and a blue bar offers **Restore the other version**.
- The sync name and passcode together form a secret address for your data. Nobody can list or browse the database, but anyone who knows both can open your account, so pick a hard-to-guess passcode and keep it private.
- Free Firebase limits (1 GB storage, 10 GB downloads a month) are far more than this app needs.
- Deleting an account on a device only removes that device's copy. The cloud copy stays until you delete it in the Firebase console (Data tab).

## Install on your devices
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** ⋮ menu → **Install app**.
- **Mac:** Safari File → **Add to Dock**, or the install icon in Chrome.

## Backups
**⚙ Manage → Export data** downloads a JSON backup of the account you are in. **Import** restores it, or use **Import a backup as a new account** on the start screen.

## Updating the app yourself
1. Edit `src/app.jsx`, then run
   `npm install esbuild react react-dom`
   `npx esbuild src/app.jsx --bundle --minify --loader:.jsx=jsx --define:process.env.NODE_ENV='"production"' --target=es2018 --outfile=app.js`
2. In `sw.js` change `const CACHE = 'gtf-v5'` to `'gtf-v6'` (and so on).
3. Upload the changed files.
