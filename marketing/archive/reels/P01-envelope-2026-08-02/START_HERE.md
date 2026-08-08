# P01 Envelope Pilot

This package uses the real Shaadi Nyota recording inside a bride-held phone. The invitation UI is never regenerated.

## One-time Flow character setup

1. In Flow, open **Characters → New Character**.
2. Upload both files from `character-assets/`:
   - `CHAR-01_Aanya_Full-Body_v1.png`
   - `CHAR-01_Aanya_Close-Up_v1.png`
3. Name the character `NyotaBride`.
4. Choose a warm Indian female voice with natural Hinglish delivery.
5. Save the character and confirm that selecting `@NyotaBride` visibly attaches it.

## Generate the only missing clip

1. Start a new Flow project.
2. Turn **Agent ON** and choose **Video → Gemini Omni Flash → 9:16 → 8 seconds → one output**.
3. Select the saved `@NyotaBride` character.
4. Paste the complete contents of `P01_OMNI_PRESENTER_PROMPT.txt`.
5. Generate exactly one presenter clip and download it without editing.
6. Save it in this folder as `P01_Aanya_Presenter_v1.mp4`.

Once that single file is present, the final deterministic timeline is:

- `00:00–00:08` — Aanya presenter
- `00:08–00:16` — `P01_Product-Proof_Phone_v1.mp4`
- `00:16–00:18` — `P01_CTA_Endcard_v1.mp4`

Captions, music and the final export should be added after the presenter clip is approved. Do not ask Flow to recreate the product footage or end card.

## Prepared assets

- `P01_Product-Proof_Phone_v1.mp4` — final eight-second phone product proof, 1080×1920, 30 fps, silent
- `P01_CTA_Endcard_v1.mp4` — final two-second branded CTA, 1080×1920, 30 fps, silent
- `WS-01_Classic-Envelope_Phone-Master_v1.mp4` — clean six-second opening-only phone master
- `WS-01_Classic-Envelope_Opening-Clean_v1.mp4` — trimmed original screen recording without the phone treatment
- `phone-plate-bride-v2.png` — approved compositing plate

`phone-plate-bride-v1.png` is an unused first attempt whose screen proportions did not match the recording. Do not upload it.
