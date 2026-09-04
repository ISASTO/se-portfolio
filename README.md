# Isaac Stoltz — Software Engineering Portfolio

A lightweight, hand-built portfolio for selected software engineering work.

## Projects

- **Movie Master** — static storefront, browser game, Cloudflare Worker API, D1 analytics, and public leaderboards.
- **Minimal Garmin** — a focused Connect IQ watch face for the Garmin Forerunner 955.
- **Bugnut** — a Next.js comic reader with an automated image-processing and publishing pipeline.

## Local preview

```sh
npm run serve
```

Then open <http://localhost:8000>.

## Validation

```sh
npm test
```

The validation script checks page structure and local links without introducing a build step or runtime dependencies.

## Deployment

Every push to `main` validates the site and deploys the repository root through GitHub Pages. The site is plain semantic HTML, CSS, and minimal JavaScript; no production build is required.
