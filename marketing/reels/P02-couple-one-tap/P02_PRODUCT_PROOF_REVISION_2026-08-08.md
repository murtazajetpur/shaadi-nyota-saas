# P02 - Product Proof Revision

Date: 2026-08-08

Status: Revised product-proof approval candidate

## User request

- Show the Palace Door opening fully at the start, similar to the first Reel's product reveal pacing.
- Skip the event/details section a bit.
- Then show RSVP clearly.
- Use a handheld phone treatment so it looks like someone is holding the phone.

## Revised output

`product-proof-2026-08-08/P02_Product-Proof_Handheld-Palace-RSVP_v2-large-phone.mp4`

QA contact sheet:

`product-proof-2026-08-08/P02_Product-Proof_Handheld-Palace-RSVP_v2-large-phone_QA.jpg`

Builder:

`build_p02_product_proof_handheld.py`

## Source timing map

From `marketing/wedding website screen recording/palace door opening christian.mp4`:

- 00.0-06.2: full Palace Door opening/entry.
- 24.8-26.2: short middle details/functions bridge.
- 31.0-34.6: RSVP-focused hero moment.

## Specs

- Duration: 11.20 seconds.
- Output: 1080x1920.
- Frame rate: 30 fps.
- Codec: H.264, yuv420p.
- Audio: none.
- Treatment: real product recording inside handheld phone plate.
- Product screen height: 68.8% of frame height.
- Product pixels: source recording is preserved and not redrawn.

## QA notes

- Opening section 0.0-6.2 has no freeze-detection flags.
- Overall freeze scan flags static sections during the later RSVP/readable screen area:
  - 7.93-9.23s
  - 9.40-10.07s
- These appear to come from the RSVP source screen being readable/static, not from a broken opening animation. Human review should confirm it feels like a readable RSVP proof moment.

## Next

If approved, use this product proof in the final Reel assembly after CTA still approval.
