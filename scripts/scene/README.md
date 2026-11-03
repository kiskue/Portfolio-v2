# Painted hero scene assets

`scripts/prepare-scene.mjs` writes the committed files of the painted Home hero:
`public/scene/*`, `public/audio/ride-the-wind.mp3` and
`src/components/sections/home/dragon/dragon-spine.ts`.

## Provenance

- The day and night paintings and the dragon frames are the owner's own pictures, made with Gemini.
- Nothing comes from TikTok or any other third-party material.

## The track

- "Ride The Wind" by Scott Buckley, https://www.scottbuckley.com.au/library/ride-the-wind/ (download: https://www.scottbuckley.com.au/library/wp-content/uploads/2025/01/RideTheWind.mp3), released under CC BY 4.0.
- Credit: `'Ride The Wind' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au`
- sha256 of the original `RideTheWind.mp3` (320 kb/s): `0adeacb87531510d91ab2b88b92ea6625e27d7346de1dc0011a8d9b3bd41388e`. The script refuses any other file.
- The encode, exactly:

  ```
  ffmpeg -hide_banner -y -i RideTheWind.mp3 -map 0:a:0 -c:a libmp3lame -b:a 112k -ar 44100 -ac 2 -id3v2_version 3 public/audio/ride-the-wind.mp3
  ```

- This is a technical modification under CC BY 4.0 section 2(a)(4): the whole song, unedited. No trims, no fades, and the tags are kept.

## How `assets/` was made

The scripts in `tools/` are copies of the originals; they need numpy plus an ffmpeg binary and are run with `python -I`.

1. `tools/dragon_key.py` with `DRAGON_W=800` keys the three dragon frames (`source/dragon-rear-*.jpg`) out of their green background into transparent PNG/WebP frames (`assets/rear-keyed-*.png`).
2. `tools/tail_layer.py` then runs on those frames and writes the tail-less body frames (`assets/rear-body-*.webp`), the tail texture (`assets/rear-tailtex.webp`) and the spine (`assets/rear-spine.json`).
3. `tools/tail_fk_tune2.py` is the tuning helper used for the tail's forward kinematics.

## Rebuild

```
npm run scene:prepare -- [--from=<dir>] [--ffmpeg=<path>] [--skip-audio]
```

`--from` defaults to `D:/Projects/Porfolio-V2/.planning/painted-hero` (it holds `source/`, `assets/`, `audio/`). `--ffmpeg` defaults to `$FFMPEG`, then `ffmpeg` on PATH, and needs `libmp3lame`. Commit what the script writes.
