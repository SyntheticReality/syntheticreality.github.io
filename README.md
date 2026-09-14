# Osyrys

Public website: https://www.syry.io. GitHub Pages publishes successful builds from `master` using the existing `.github/workflows/deploy.yml`.

## Editing

- `website/`: approved company pages as complete HTML documents. The small wrappers in `src/pages/` render these documents without changing the authored canvas artwork, styles or interactions.
- `public/assets/`: company-site images, fonts, CSS and JavaScript.
- `seo.config.json`: production descriptions, canonical origin and search policy. `scripts/prepare-seo.mjs` runs automatically before development and builds; it updates website metadata and the three compatible sitemap endpoints in `public/`.
- `src/pages/ggc/`, `src/pages/ggc-privacy-policy.md`, `src/pages/ggc-tou.md`, `src/pages/cyberbladebattles-privacypolicy.md`: retained game landing and legal content, with their original Astro layouts and assets.

## Commands

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Build runs Astro diagnostics and generates the complete static site in `dist/`. GitHub Pages uses that output. The company pages require no backend; contact links use `hello@syry.io`.

## Launch routing and SEO

Home, Enterprise (`/enterprise/`), Entertainment (`/entertainment/`), About and Contact are indexable. The old `/work/` and `/play/` URLs forward immediately to their new category pages using static redirects, preserving query strings and fragments when JavaScript is enabled. The existing GGC landing page and three game policy pages keep their URLs and remain in the sitemap. Retained project detail pages remain noindex while project information is presented through image flips. Design comparison galleries remain in the separate prototype and are not published here.

Old `/games/`, `/simulations/` and `/education/` links lead to their new categories using immediate HTML redirects supported by static hosting. Their `#contact` calls to action lead to `/contact/`; the homepage also retains a `#contact` anchor. `/blog/` leads to the existing Medium publication; the old sample posts remain accessible but noindex and outside the sitemap. `/sitemap-index.xml` and `/sitemap-0.xml` remain compatible with existing submissions.

The GitHub Pages custom domain and DNS configuration are retained. After deployment, verify https://www.syry.io, the five primary pages, the four preserved game/legal pages, sitemap, assets and unknown-path 404 behavior. Search Console ownership/submission and field Web Vitals are account/measurement tasks, separate from publishing this source.

## Rollback

The previous production revision is `5e9693b45c783e5fc5a1ef9fe6b1252718bf99a1`, also tagged `pre-luminous-launch-2026-09-13`. To undo this launch while preserving history, revert the launch commit on `master` and push; the same Pages workflow publishes the previous design. Do not force-push the branch.
