# BrowserQuest Modernized

This repository modernizes Mozilla's BrowserQuest experiment so it runs on current Node.js versions and adds a server-authoritative MMO progression foundation.

## Run locally

Requirements: Node.js 20 or newer and npm/pnpm.

```sh
npm install
npm start
```

Open <http://localhost:8000>. The Node server now serves both the game client and the WebSocket endpoint. Its health endpoint is <http://localhost:8000/status>.

## MMO progression

- Every kill and collected item awards XP.
- XP thresholds increase by level.
- `Pest Control`, `Bone Collector`, and `Field Supplier` are one-time quests.
- `Hunt Contract` resets after every five kills and can be completed indefinitely.
- Progress is stored server-side in `server/data/progression.json` and restored by case-insensitive character name.
- The in-game level display opens a quest journal with progress and rewards.

Character names are not authenticated in this historical prototype. A production deployment should add accounts and attach progression records to account IDs rather than names.

## Verification

```sh
npm run check   # parses all server/shared/client JavaScript
npm test        # progression behavior tests
npm run smoke   # starts a server and tests HTTP + WebSocket handshake
```

## Docker

```sh
docker build -t browserquest .
docker run --rm -p 8000:8000 browserquest
```

Then open <http://localhost:8000>.

## Modernization notes

The obsolete dual WebSocket implementation (`websocket` and `websocket-server`) was replaced by `ws`. The abandoned sanitizer dependency was replaced with local control-character removal and HTML escaping. The legacy logger was replaced with a small built-in logger, metrics now use `memjs`, dependency ranges are pinned, deprecated Node APIs were updated, and the old Node 0.6/10 install scripts and Ubuntu 14.04 container were replaced.

The browser renderer still uses its original vendored RequireJS/jQuery-era client so the art, input, and rendering behavior remain compatible. New game state is delivered through an additive protocol message (`PROGRESSION`, type 27).

## License

Code is licensed under MPL 2.0. Content is licensed under CC-BY-SA 3.0. See [LICENSE](LICENSE).
