# People Search

A local demo of a company to people to work-email run, with a live cost meter and a receipt.

Mock mode is the default. The companies and people shipped with the app are fictional. Emails use `.example` domains. The screen marks those runs as Example data.

## Run

```bash
bun install
bun run dev
```

## Checks

```bash
bun test
bun run lint
bun run build
bun run build:single
```

`bun run build:single` writes `treg-people-search.html`. Open that file directly. Example mode does not fetch anything.

## Live mode

Settings has a Treg API key field, a base URL, and a switch. The switch stays off until a key is saved. The key is stored in this browser only (`localStorage` key `treg-people-search-lab:v1`). Live calls spend real balance. Calls go to `POST {base URL}/call/{endpoint}` with the header `X-Treg-Token`.

If the browser blocks the call, use "Run in example mode instead".
