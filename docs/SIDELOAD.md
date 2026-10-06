# Install Finance on your iPhone for free (SideStore)

No paid Apple Developer account needed. GitHub builds an unsigned IPA; SideStore signs it on your phone with your free Apple ID.

## 1. Build the IPA
1. Push this repo to GitHub. Private is fine, but macOS runner minutes count 10x against the free quota (about 200 macOS minutes a month, so a few builds). A public repo has no limit.
2. Open the repo's **Actions** tab, pick **iOS unsigned IPA**, then **Run workflow**. It takes roughly 20 to 30 minutes.
3. When it finishes, download **Finance-unsigned-ipa** from the run's Artifacts (unzip it to get `Finance-unsigned.ipa`). Pushing a `v*` tag also attaches the IPA to a GitHub Release.
4. Move the IPA to your iPhone (AirDrop or iCloud Drive).

## 2. Install SideStore (one time)
Follow the official guide: https://docs.sidestore.io/docs/installation/prerequisites. It needs a computer once, a USB cable, and your free Apple ID.

## 3. Install Finance
1. In SideStore, sign in with your free Apple ID.
2. On the **My Apps** tab tap **+** and choose `Finance-unsigned.ipa`.
3. Turn on **Background Refresh** in SideStore so it re-signs the app automatically.

## Limits of the free Apple ID
- Apps expire after 7 days unless refreshed; SideStore refreshes them in the background (open it now and then).
- Three active apps at once, including SideStore.
- Your data survives refreshes.
- Push notifications and iCloud need the paid account.

## Update the app
Re-run the workflow, download the new IPA, and install it in SideStore over the old app. The bundle id (`com.thenetaji.cadence`) is unchanged, so your data is kept.
