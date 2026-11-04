# Painted hero scene assets

`scripts/prepare-scene.mjs` writes the committed files of the painted Home hero:
`public/scene/*`, `public/audio/ride-the-wind.mp3` and
`src/components/sections/home/dragon/dragon-spine.ts`.

## Provenance

- The day and night paintings and the dragon frames are the owner's own pictures, made with Gemini.
- No third-party picture is used: no picture comes from TikTok or any other outside source. The only third-party material is the track below, used under CC BY 4.0 with the credit given there.

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

The inputs (`source/`, `assets/`, `audio/`) live only in the local `.planning/painted-hero/` folder, which git ignores: none of them is committed. The scripts in `tools/` are copies of the originals kept there; they need numpy plus an ffmpeg binary and are run with `python -I`. From `.planning/painted-hero/`, with `<ffmpeg>` the ffmpeg binary and `frames/` a scratch folder:

1. Key the three dragon frames out of their green background. `dragon_key.py` crops all three to one box, scales them to 800 px wide and writes `frames/dragon-<name>.png` and `frames/dragon-<name>.webp`:

   ```
   DRAGON_W=800 python -I tools/dragon_key.py <ffmpeg> frames up=source/dragon-rear-up.jpg level=source/dragon-rear-mid.jpg down=source/dragon-rear-down.jpg
   ```

2. Split the frames into tail-less bodies and one bending tail. `tail_layer.py` reads `frames/dragon-{up,level,down}.png` and writes `assets/rear-body-{up,level,down}.webp`, `assets/rear-tailtex.webp` and `assets/rear-spine.json`:

   ```
   python -I tools/tail_layer.py <ffmpeg> frames assets
   ```

3. Keep the keyed PNGs as the no-WebGL frames under their input names: rename `frames/dragon-up.png`, `frames/dragon-level.png` and `frames/dragon-down.png` to `assets/rear-keyed-up.png`, `assets/rear-keyed-level.png` and `assets/rear-keyed-down.png`. The `frames/dragon-*.webp` files are the mockup's `rear-*.webp`; `prepare-scene.mjs` does not read them.

Run this way with the ffmpeg of imageio-ffmpeg 0.8.0 and numpy 2.5, the three steps rebuild every `assets/rear-*` file byte for byte (checked 2026-11-04).

`tools/tail_fk_tune2.py` makes no assets. It is a tuning check: it prints how far the tail swings under a few forward-kinematics settings (`python -I tools/tail_fk_tune2.py assets/rear-spine.json`).

## Rebuild

```
npm run scene:prepare -- [--from=<dir>] [--ffmpeg=<path>] [--skip-audio]
```

`--from` defaults to `D:/Projects/Porfolio-V2/.planning/painted-hero` (it holds `source/`, `assets/`, `audio/`). `--ffmpeg` defaults to `$FFMPEG`, then `ffmpeg` on PATH, and needs `libmp3lame`. Commit what the script writes.
