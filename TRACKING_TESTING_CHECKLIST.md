# Live Tracking Testing Checklist (Phase 1)

> Run on a physical iPhone with a development build (`development-device` EAS
> profile) — the Simulator cannot exercise background location, permission
> upgrades, or app-kill recovery. Automated coverage already exists for the
> server contract (`apps/api/src/modules/track/track.service.spec.ts`, 39
> scenarios) and the headless ingest task
> (`apps/mobile/src/__tests__/trackingTask.test.ts`, 14 scenarios); this
> checklist covers what only a device can verify.

---

## A. Start Flow

- [ ] **A1. Entry point gating** — On a `planned` expedition, open UPDATE LOCATION: no live-track card shown. Start the expedition; card appears. On a `completed` expedition: no card.
- [ ] **A2. Live-track sub-mode** — Tap "OR — LIVE TRACK FROM THIS DEVICE". Modal flips to live-track mode: copper info box, "← UPDATE LOCATION INSTEAD" back link, LIVE TRACKING PRIVACY picker, footer reads BEGIN TRACKING. Back link returns to manual mode with waypoint list intact.
- [ ] **A3. Privacy persisted on begin** — Pick SPONSORS ONLY, tap BEGIN TRACKING. Verify on web (owner) the visibility cycler shows SPONSORS. Server column `live_track_visibility` = 'sponsors'.
- [ ] **A4. Cadence prompt** — After BEGIN TRACKING + foreground permission, the START LIVE TRACKING card modal appears with DAY TRIP and MULTI-DAY (SUGGESTED) options. CLOSE in the header cancels without starting.
- [ ] **A5. Foreground permission denied** — Deny When-in-Use at the OS prompt. Verify "Location permission needed" alert, modal stays open, no track created server-side.
- [ ] **A6. Two-tier permission flow** — Pick a mode with When-in-Use granted but not Always. Verify the BACKGROUND TRACKING explainer (Step 2 of 2) appears AFTER the mode pick. ENABLE ALWAYS-ON TRACKING triggers the OS upgrade prompt.
- [ ] **A7. Always granted** — Grant Always in A6. Verify banner shows LIVE (not PAUSED) and points record (status was auto-resumed after the grant).
- [ ] **A8. Maybe Later on Active mode** — Dismiss the explainer with MAYBE LATER on a DAY TRIP session. Tracking records in-foreground; backgrounding the app stops point delivery (When-in-Use limitation) and resumes on foreground.
- [ ] **A9. Maybe Later on Conservative mode** — Dismiss the explainer on a MULTI-DAY session. Verify the warning alert (Conservative needs Always to be useful) before dismissal completes.

## B. Recording (Foreground)

- [ ] **B1. Banner states** — While LIVE: pulsing green dot, expedition title, DROP / PAUSE / STOP buttons. Tap banner body → navigates to the expedition screen.
- [ ] **B2. Points flow** — Walk ~100 m. Web expedition page (owner, second device or desktop) shows the polyline growing within ~90 s (60 s flush + 30 s poll).
- [ ] **B3. Pin promotion** — Verify the expedition's current-location pin follows the latest track point ('live_track' source) on web and mobile detail.
- [ ] **B4. Quick-drop waypoint** — Tap DROP on the banner → DROP WAYPOINT modal opens (copper header, title field, location row). Confirming with everything untouched creates "Quick waypoint" at the latest GPS fix. DROP is disabled before the first fix arrives.
- [ ] **B5. Quick-drop with title + re-assigned location** — In the modal, type a title and tap CHANGE → map/search picker opens seeded at the GPS fix; pick elsewhere, confirm. Waypoint lands at the picked point with the typed title. USE GPS FIX reverts to the live fix.

## C. Background & Kill Recovery

- [ ] **C1. Locked-phone recording** — With Always granted, lock the phone and walk ≥10 min (Active mode). Unlock: points cover the locked interval (SQLite buffer drained on next flush).
- [ ] **C2. App killed, OS still tracking** — Force-quit the app mid-session. Move ≥500 m (Conservative) or ≥50 m (Active). iOS relaunches headless; on next app open the banner restores from the persisted session and buffered points upload (check web polyline for the gap interval).
- [ ] **C3. Conservative deferred batching** — MULTI-DAY session, phone locked 1+ h stationary then a short walk. Battery drain should be minimal while stationary; points arrive in deferred clumps, not every 5 min exactly.
- [ ] **C4. Permission revoked mid-track** — In iOS Settings, downgrade Always → While Using while a session is LIVE. Return to the app: error banner text about revoked background permission appears.

## D. Pause / Resume / Stop

- [ ] **D1. Pause** — Tap PAUSE. Dot goes gray, OS location updates stop (no new points server-side), session row persists. RESUME continues the SAME track (one polyline, no new trackId).
- [ ] **D2. Stop happy path** — Tap STOP, confirm. Banner dismisses, server track gets `ended_at`, pin stays frozen at the final point ("frozen-live"), badge on web flips to "Last tracked …".
- [ ] **D3. Stop with network down** — Airplane mode, tap STOP. Verify "Could not stop tracking" alert with Retry; banner returns (session still recording). Disable airplane mode, Retry succeeds.
- [ ] **D4. Stop from web (symmetric controls)** — While the phone tracks, press STOP TRACKING on the web hero bar (owner). Within ~60 s the phone shows "Tracking stopped … from another device" and the banner dismisses; GPS stops.
- [ ] **D5. Manual update implicit-stop** — While tracking, set a manual location (waypoint/entry) from the web or mobile UPDATE LOCATION manual mode. Server ends the track; phone winds down as in D4; pin shows the manual pick, not the live point.

## E. Offline Buffer

- [ ] **E1. Offline accumulation** — Airplane mode mid-session, walk 5+ min. No server errors surfaced; points buffer locally (banner stays LIVE).
- [ ] **E2. Reconnect drain** — Disable airplane mode. Within one flush cycle the buffered points appear on web in order, no duplicates (client_uuid dedup).
- [ ] **E3. Cross-restart drain** — Airplane mode, force-quit, relaunch with network. Buffered points from before the kill upload on launch.

## F. Conflict Recovery (single active track)

- [ ] **F1. Same-expedition orphan** — Start a track, force-quit before stopping, clear app data / reinstall (or wait for a dev-reload that loses local state), then start tracking on the SAME expedition. Verify "Previous session still active" dialog with started-at timestamp; "Stop and start here" stops the orphan and starts fresh.
- [ ] **F2. Other-expedition orphan** — With an active track on expedition A (e.g. started then app state lost), attempt to start on expedition B. Dialog names expedition A's title; "Stop and start here" stops A's track and starts B.
- [ ] **F3. Cancel keeps orphan** — In either dialog, tap Cancel. No track is stopped or started.

## G. Web Consumer

- [ ] **G1. Polyline + head dot** — Public-visibility live track renders a green polyline with a pulsing head dot on the expedition map.
- [ ] **G2. Freshness badge** — "LIVE · n min ago" while active; heartbeat alone (stationary phone) keeps it fresh past 15 min; flips to "Last tracked …" after stop.
- [ ] **G3. Poll pause on hidden tab** — Background the browser tab 2+ min; network tab shows no /tracks/current requests until refocus, then an immediate catch-up fetch.
- [ ] **G4. Sponsor CTA** — As a logged-out or non-owner viewer of an actively-tracking sponsorable expedition, the live bar shows SPONSOR THIS EXPEDITION linking to the sponsor flow (auth redirect when logged out).
- [ ] **G5. Owner visibility cycler** — Owner sees Visibility: PRIVATE/SPONSORS/PUBLIC button cycling on click; non-owners never see it.

## H. Visibility Enforcement

- [ ] **H1. Private (default)** — Fresh expedition, never touched the picker: non-owner and logged-out viewers see NO polyline, badge, or live bar. Owner sees everything.
- [ ] **H2. Sponsors-only** — Set SPONSORS. An active sponsor of the explorer sees the track; a non-sponsor logged-in user does not; logged-out does not.
- [ ] **H3. Public** — Set PUBLIC. Logged-out viewer sees polyline + badge.
- [ ] **H4. Date-window trim** — As non-owner on a public track, confirm no points outside the expedition's start/end dates render (owner sees full track).
- [ ] **H5. One-decision privacy** — Picking PRIVATE in the live-track setup ("WHO CAN WATCH YOU?") hides BOTH the route line and the current-location pin from non-owners (no pin leak); picking PUBLIC exposes both. The line-only split still works via the web visibility cycler + LOCATION PRIVACY in the manual update view.

## I. Lifecycle Auto-Stop

- [ ] **I1. Expedition completed mid-track** — Mark the expedition completed (web) while the phone tracks. Next flush returns trackEnded; phone banner dismisses; track has `ended_at`.
- [ ] **I2. Start blocked on completed/cancelled** — UPDATE LOCATION on a completed expedition shows no live-track card; a direct API start returns 403.

## J. Session Persistence & Auth Boundaries

- [ ] **J1. Reload restores live session** — While tracking, reload the app (dev: shake → Reload; prod: force-quit + relaunch). Banner returns as LIVE with the same expedition title; no 409 on points; recording continues on the same track.
- [ ] **J2. Reload restores paused session** — Pause, then reload. Banner returns as PAUSED (not recording). Resume works on the same track.
- [ ] **J3. Stale session winds down on reload** — While the app is dead, stop the track from the web. Relaunch: the session quietly clears (no banner, no error), and no orphan dialog on next start.
- [ ] **J4. Logout stops tracking** — Log out while tracking. Track gets `ended_at` server-side; banner gone on the login screen.
- [ ] **J5. Account switch is clean** — Log out (while tracking) and log in as a different account. No tracking banner, no foreign uploads; the second account can start its own track without a 409.

## K. Persistent Expedition Banner

- [ ] **K1. Active quick-access** — With an active (non-blueprint) expedition and no live tracking, a copper ACTIVE EXPEDITION banner shows on all screens; tap → expedition page.
- [ ] **K2. Planned quick-access** — With only a planned expedition, the banner is blue PLANNED EXPEDITION.
- [ ] **K3. Tracking takes over** — Start live tracking: the banner swaps to the tracking controls (one banner, never stacked). Stop: it reverts to quick-access.
- [ ] **K4. No dead gap** — With any banner visible, no blank band between the banner and screen headers (expedition detail, feed, discover, bookmarks, profile). Without a banner, headers clear the notch as before.
- [ ] **K5. Current-location bar live state** — On the tracked expedition's page, the blue bar reads LIVE TRACKING / "Pin updates automatically" (or "Acquiring GPS…") instead of "Not set"; paused shows TRACKING PAUSED; coords appear once the first fix lands.
- [ ] **K6. Banner refresh** — Complete the active expedition on web, background + foreground the app: quick-access banner disappears (or switches to the next planned expedition).
