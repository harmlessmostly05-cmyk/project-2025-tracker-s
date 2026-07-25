# Project 2025 Tracker — prototype (v2, mobile-first)

A calm, transparent, mobile-first static site pairing *Mandate for Leadership* (Project 2025) recommendations with credibility-rated reporting on what is actually happening. Design guided by the project manifesto (`readme.txt.txt`).

## What's here

- `index.html`, `styles.css`, `app.js` — the site, no build step. Mobile-first; desktop is the enhancement.
- `data/recommendations.json` — 61 recommendations from 4 chapters (Central Personnel Agencies/Schedule F, DHS, Education, DOJ), each with theme tags, timeline stage, implementation **status** (Proposed / In Progress / Implemented / Blocked-Stalled) with a sourced status note, a neutral summary, verbatim quote, and page citation.
- `data/news.json` — 56 verified news items, tagged High/Medium/Low credibility by source type.

## Manifesto features implemented

- Theme status board: tappable per-theme progress bars (Civil Service, Immigration, Education, ...).
- Two-tap filters: agency, timeline stage, status.
- Cards lead with a TL;DR; "Deep dive" expands to a strict two-pane split — *What the policy plan says* (verbatim quote + page cite) vs. *What is happening now* (credibility-rated reporting).
- Every card has a Share button; shared links (`#rec-<id>`) deep-link straight to that card with its deep dive open, plus a "See full dashboard" escape hatch.
- Calm palette, smooth transitions, `prefers-reduced-motion` respected.

This is a **prototype covering 4 of the book's 30 chapters**, built to validate the design and data model before extracting the rest.

## Preview locally

Browsers block `fetch()` of local JSON files when you just double-click `index.html` (the `file://` protocol). Run a tiny local server instead:

```
cd "path/to/this/folder"
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Deploying publicly (GitHub Pages)

1. Create a new GitHub repository and push this folder's contents to it.
2. In the repo settings, enable **Pages** → deploy from the `main` branch, root folder.
3. GitHub gives you a live URL (e.g. `https://yourname.github.io/project-2025-tracker`).

I don't have a connector to push to GitHub directly on your behalf — you'd create the repo yourself (or connect a GitHub/deploy tool and I can walk through it interactively).

## Next steps

- Expand `data/recommendations.json` to the remaining 26 chapters.
- Broaden `data/news.json` coverage per recommendation.
- Set up a recurring scheduled task to research new developments and append to `news.json` automatically.
