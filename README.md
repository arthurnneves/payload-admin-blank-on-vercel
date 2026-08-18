> **Resolved — and the cause was NOT in Payload.** This reproduction did its job
> by *failing* to reproduce: seven configuration groups were added to it without
> ever breaking the admin, which proved that Payload 3.87.1 + Next 16.3.0 on
> Vercel works. The bug was in the original application: its S3/R2 storage plugin
> was only added to the config when the credentials existed, so `importMap.js`
> was generated and committed **without the plugin's client components**. In
> production the plugin was active, the admin requested components the map did
> not declare, and nothing mounted — silently, because a component missing from
> the import map does not throw.
>
> The rule that came out of it: what varies per environment must be the *value*,
> never the *presence* of a plugin — and the import map has to be generated in
> the same state production runs in.
>
> No issue was filed against payloadcms/payload. This repository is archived and
> kept only as a record of the method.

---

# Reproduction: Payload admin renders blank on Vercel (works with `next start`)

Minimal Payload app — one auth collection, one content collection, default
editor, nothing else. It builds and runs identically in both places, but:

- **`next start` locally** → the admin renders (create-first-user / login)
- **deployed to Vercel** → every `/admin` route renders a **blank page**

The server response is complete and correct in both cases. On Vercel the
browser receives the full admin markup and never mounts it: no visible text, no
admin root element, **no console errors and no failed network requests**.

## Versions

| | |
|---|---|
| payload | 3.87.1 |
| @payloadcms/next, /ui, /richtext-lexical, /db-postgres | 3.87.1 |
| next | 16.3.0 |
| react / react-dom | 19.2.6 |
| Node | 24.x |
| pnpm | 11.21.0 |
| Database | PostgreSQL 18 (Neon) |
| Host | Vercel (Hobby) |

## Steps to reproduce

1. `pnpm install`
2. Set `DATABASE_URI` (any empty Postgres database) and `PAYLOAD_SECRET`
3. `pnpm build && pnpm start` → open `http://localhost:3000/admin`
   → **the admin renders correctly**
4. Deploy the same commit to Vercel, with the same two environment variables
5. Open `<deployment>/admin` → **blank page**

## What the browser shows on Vercel

On the blank page, in the console:

```js
document.body.innerText.trim().length          // 0
document.body.innerHTML.includes('<some admin string>') // true — server markup is there
document.querySelector('#app, main')            // undefined — admin root never created
```

Reproduced in Chrome, Edge, Firefox (desktop) and Safari (iOS).

## Ruled out in the original project

The same failure was investigated at length in a larger project before this
reproduction was made. Ruled out, each with evidence:

- **Turbopack** — reproduced with `next build --webpack` too
- **Vercel build cache** — reproduced after a redeploy with the cache disabled
- **Stale `importMap.js`** — regenerated, complete
- **Assets not served** — every chunk and stylesheet returns 200 with the correct MIME type
- **Vercel's `/_next/static/immutable/` path rewrite** — consistent everywhere, all resolving
- **Truncated RSC payload** — local and production payloads end with byte-identical content
- **CSP / security headers** — none are sent
- **Wrong `NEXT_PUBLIC_SERVER_URL`** — no wrong origin appears in any served chunk
- **Hydration broken deployment-wide** — a trivial client component on a public
  route of the same deployment hydrates and responds to clicks

The pattern suggests the admin's client tree starts rendering and never
resolves — as if something it awaits never settles, rather than throwing.
