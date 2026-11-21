# Carpenza Interiors

Website for Carpenza Interiors: carpentry, modular kitchens, wardrobes and storage, TV units and wall
panels, false ceilings and gypsum work, painting and finishing.

## Develop

Plain HTML, CSS and JavaScript in `src/`. No npm dependencies.

```bash
npm run lint    # script parses, every file the page points at exists, no stray hosts
npm test        # build output, contact links, gallery filters, videos
npm run build   # src/ → dist/ with content-hashed CSS and JS
python serve.py # serves dist/ on 127.0.0.1:5180 (PORT=... to change)
```

## Photos and videos

Raw photos and videos are kept out of this repo. `scripts/media.py` (needs Pillow and ffmpeg) reads
them from `../architect-portfolio/media-inbox` (or `MEDIA_IN`) and writes:

- `src/assets/work/<slug>-s.webp` and `-l.webp`, plus `photos.json`, which drives the gallery
- `src/assets/video/*.mp4` (silent, 540 px wide) with a poster frame
- `src/assets/mark.png`, `lockup.png` and `icon.png`, cut from the banner

To add or drop a photo, edit the `PHOTOS` table in `scripts/media.py` (number in the inbox, slug,
category, title, and any areas to blur) and run `npm run media`. Re-encoding drops all EXIF and GPS
data. Before adding a photo, check it for people, house or flat numbers, name plates, client logos
and personal belongings.

## Deploy

GitHub Pages, from `.github/workflows/pages.yml`: every push to `main` runs lint and tests, builds
`dist/` and publishes it. Pull requests run the same checks without publishing.
