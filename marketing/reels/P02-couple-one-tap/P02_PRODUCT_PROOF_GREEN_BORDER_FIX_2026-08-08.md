# P02 - Product Proof Green Border Fix

Date: 2026-08-08

Status: Fixed product-proof candidate

## Issue

The handheld phone product proof had a bright green border visible around the phone-screen corners. This came from leftover chroma-green plate pixels not fully covered by the real product recording.

## Fixed output

`product-proof-2026-08-08/P02_Product-Proof_Handheld-Palace-RSVP_v3-no-green-border.mp4`

QA contact sheet:

`product-proof-2026-08-08/P02_Product-Proof_Handheld-Palace-RSVP_v3-no-green-border_QA.jpg`

## Change made

Updated `build_p02_product_proof_handheld.py` to over-cover the detected chroma screen area by 8 pixels before compositing the real Palace Door recording.

This keeps the real product recording untouched, but removes the visible green plate edge.

## QA

- Output duration: 11.20 seconds.
- Output size: 1080x1920.
- Frame rate: 30 fps.
- Product screen height: 68.5% of frame height.
- Opening section 0.0-6.2s has no freeze-detection flags.
- Bright green edge-pixel scan:
  - Previous v2 edge green total: 91,004 sampled pixels.
  - New v3 edge green total: 0 sampled pixels.

## Next

Use v3 as the product-proof section for final assembly after CTA still approval.
