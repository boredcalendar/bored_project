# E2E Testing

Use `agent-browser` for lightweight browser checks of the local app.

## Start Fresh

Before testing, close old browser pages so saved tabs or stale refs do not affect the run:

```sh
agent-browser close --all || true
```

Start or verify the Astro dev server:

```sh
vp run dev --background
vp run astro dev status
```

Astro 7 keeps this dev server running in the background. Stop it with:

```sh
vp run astro dev stop
```

## Open The App

Open the React app route, not just the landing page:

```sh
agent-browser open --enable react-devtools http://localhost:4321/app/
agent-browser wait --load networkidle
agent-browser snapshot -i
```

Expected basics:

- Page title is `Bored Calendar`.
- Heading `Your bored moments` is present.
- Calendar day buttons render.
- The minutes slider, `+10`, `Clear`, note textbox, and save/update button render.

## Smoke Test Flow

Use this flow to verify the React app is hydrated and IndexedDB persistence works:

```sh
agent-browser fill @NOTE_REF "Agent browser smoke test"
agent-browser click @SAVE_REF
agent-browser wait 500
agent-browser open http://localhost:4321/app/
agent-browser wait --load networkidle
agent-browser snapshot -i
```

Confirm the note is still present and the save button changed to `Update day`.

The slider can be checked with keyboard input:

```sh
agent-browser focus @SLIDER_REF
agent-browser press ArrowRight
agent-browser snapshot -i
```

## Off-Screen Button Gotcha

`agent-browser click` can be misleading when controls are low in the viewport. In this app, `+10` and `Clear` may appear clickable in the snapshot but not update state unless they are explicitly scrolled into view first.

Before calling those controls broken, test them like this:

```sh
agent-browser scrollintoview @PLUS_TEN_REF
agent-browser click @PLUS_TEN_REF
agent-browser wait 300
agent-browser snapshot -i

agent-browser scrollintoview @CLEAR_REF
agent-browser click @CLEAR_REF
agent-browser wait 300
agent-browser snapshot -i
```

If the control works after `scrollintoview`, treat the first failure as an automation artifact, not an app bug.

## Cleanup Test Data

If a smoke test saves data, remove only the test row from IndexedDB:

```sh
agent-browser eval "(async () => await new Promise((resolve, reject) => { const req = indexedDB.open('Calendar'); req.onerror = () => reject(req.error); req.onsuccess = () => { const db = req.result; const tx = db.transaction('Logs', 'readwrite'); const store = tx.objectStore('Logs'); const all = store.getAll(); all.onsuccess = () => { for (const row of all.result) if (row.reflection === 'Agent browser smoke test') store.delete(row.id); }; tx.oncomplete = () => resolve('cleaned'); tx.onerror = () => reject(tx.error); }; }))()"
```

Reload `/app/` and confirm the test note is gone.

## Useful Commands

```sh
agent-browser snapshot -i
agent-browser scrollintoview @REF
agent-browser click @REF
agent-browser fill @REF "text"
agent-browser react tree
agent-browser eval "document.body.innerText"
```

Refs become stale after page changes. Re-run `agent-browser snapshot -i` after clicks, reloads, or dynamic UI updates.
