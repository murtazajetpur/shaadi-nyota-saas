# P02 - Product Proof Rounded Screen Fix

Date: 2026-08-08

Status: Fixed product-proof candidate

## Issue

The handheld phone background/screen had rounded corners, but the inserted real website recording was still composited as a rectangle. This made the website video corners look mismatched against the phone plate.

## Fixed output

`product-proof-2026-08-08/P02_Product-Proof_Handheld-Palace-RSVP_v6-rounded-corners.mp4`

QA contact sheet:

`product-proof-2026-08-08/P02_Product-Proof_Handheld-Palace-RSVP_v6-rounded-corners_QA.jpg`

## Change made

Updated `build_p02_product_proof_handheld.py` to:

- detect the chroma-green phone display area,
- clean the chroma area to a dark phone bezel color,
- paste the real Palace Door recording through a rounded-rectangle screen mask,
- keep the phone screen large at 68.5% of the frame height.

The Shaadi Nyota UI is still the real source recording and is not redrawn.

## QA

- Output duration: 11.20 seconds.
- Output size: 1080x1920.
- Frame rate: 30 fps.
- Opening section 0.0-6.2s has no freeze-detection flags.
- Bright green edge pixels remain at zero.
- Bright product pixels outside the rounded-corner mask dropped from 48,675 in the rectangular v3 to 2,923 in v6.

## Next

Use v6 as the product-proof section for final assembly after CTA still approval.
