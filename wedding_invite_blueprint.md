# Modern Minimal Luxury Wedding Invitation: PRD & Replication Blueprint

## 1. Title & Purpose
**Website:** Modern Minimal Luxury Wedding Invitation  
**Purpose:** To provide a highly cinematic, emotionally engaging digital invitation for a wedding, replacing traditional paper invites with a premium interactive experience.  
**Problem Solved:** Traditional digital invites often feel cheap, static, or like a standard website. This experience solves that by treating the invitation as a continuous emotional journey—starting with an immersive video reveal and flowing into a beautiful, buttery-smooth scrolling experience.  
**Target Usage:** Designed explicitly as a mobile-first premium experience, intended to be viewed on smartphones (9:16 aspect ratio), while degrading gracefully to an elegant, centered "phone-canvas" on desktop.

---

## 2. Core Experience Summary
The user journey is designed to build anticipation, deliver a high-impact reveal, and seamlessly transition into the celebration details, concluding with a warm, conversational RSVP and a loving sign-off.

**The Emotional Flow:**
1. **Anticipation (First Load):** A beautiful, static hero poster with a subtle CTA ("Tap to Reveal") greets the user immediately. There is no loading screen.
2. **The Reveal (Video Playback):** Upon tapping, an immersive, cinematic video plays (e.g., a curtain opening or an envelope unsealing). Synchronized audio starts perfectly in time.
3. **The Sacred Moment (Mid-Video):** At precisely 5.0 seconds into the video, a sacred element (e.g., Lord Ganesha) is revealed underneath or within the video context.
4. **The Transition (Post-Video):** The hero video seamlessly dissolves, leaving the user with the sacred element, which now anchors the top of the scrollable website.
5. **The Celebration (Scroll):** The user scrolls through a buttery-smooth, deeply aesthetic presentation of the couple, the wedding pheras, and the multi-day events.
6. **The Response (RSVP):** A conversational, multi-step RSVP flow captures the user's attendance without feeling like a clinical form.
7. **Closure:** A final "With Love" sign-off accompanied by a gently rotating carousel of memories to leave a lasting, warm impression.

---

## 3. Section-by-Section Blueprint

### Hero Video Section (The Reveal)
*   **Purpose:** To capture absolute attention and transition the user from the "real world" into the "wedding experience."
*   **What the user sees:** A full-screen static poster with a "Tap to Reveal" button. When tapped, the CTA disappears, background music swells, and a cinematic video plays.
*   **Trigger:** Explicit user tap (solves browser autoplay and audio restrictions).
*   **Required Assets:** High-quality MP4 video (max 8-10 seconds), high-resolution static poster image (first frame of video), background audio track.
*   **Mandatory Behaviors:** Video must play inline without native controls. Audio must fade in. Video must perfectly dissolve exactly before it loops or abruptly cuts (e.g., starting fade out at 7.95s for an 8.0s video).
*   **Excluded:** Auto-playing video, visible loading spinners.

### Section 1: Sacred Reveal
*   **Purpose:** To invoke blessings and set a culturally grounded tone immediately after the modern reveal.
*   **What the user sees:** A full-screen or prominent sacred composition (e.g., Lord Ganesha) perfectly integrated into the background.
*   **Trigger:** Revealed visually at a precise timestamp during the Hero Video (e.g., 5.0s), fully exposed when Hero dissolves.
*   **Required Assets:** Sacred composition PNG/image (transparent or carefully color-matched).
*   **Mandatory Behaviors:** Smooth fade-in and slide-up animation triggered by the video timestamp. Must act as the top-anchor of the scrollable site.

### Section 2: The Couple & The Pheras
*   **Purpose:** To officially announce the couple and ground the invitation in the sanctity of the wedding ceremony.
*   **What the user sees:** A breathtaking background image representing the ceremony (e.g., Pheras/fire), softly blended with the couple's names and a minimalist "are getting married" declaration.
*   **Trigger:** Revealed via downward scroll. Scroll-snap aligned.
*   **Required Assets:** High-resolution thematic background image.
*   **Mandatory Behaviors:** Full viewport height. Names positioned dynamically based on the image's safe zones (e.g., high in the "sky" area to avoid text clashing with visual details).

### Event Sections (Haldi, Mehendi, Sangeet, Wedding, Reception)
*   **Purpose:** To deliver the schedule and details for each distinct celebration.
*   **What the user sees:** A sequence of full-viewport sections. Each has a distinct, thematic background composition and perfectly legible text overlays.
*   **Trigger:** Revealed via downward scroll. Strict scroll-snap alignment for each event.
*   **Required Assets:** One unique background image and one matching gradient overlay/color treatment per event. Event details (Date, Time, Venue).
*   **Mandatory Behaviors:** Minimalist "Add to Calendar" and "View Location" micro-interactions. Subtle, non-looping particle effects on specific events (e.g., yellow particles for Haldi, green for Mehendi) that trigger exactly once when scrolled into view.
*   **Excluded:** Cluttered maps, dense paragraphs, distracting looping animations.

### RSVP (Conversational UI)
*   **Purpose:** To collect attendance data elegantly.
*   **What the user sees:** A clean, multi-step flow that feels like a conversation rather than a form submission.
    *   Step 1: "May we have your name?"
    *   Step 2: "Will you be celebrating with us?" (Yes / Regretfully, no)
    *   Step 3: "Where can we reach you?" (Phone)
    *   Step 4: Success Message.
*   **Trigger:** Scroll into view. Progress triggered by user input (Enter key or arrow button).
*   **Mandatory Behaviors:** Smooth fade-in between steps. Minimalist single-line inputs with soft underlines. Clean pill buttons for choices.

### Final Closing Section ("With Love")
*   **Purpose:** To provide a warm, emotional send-off.
*   **What the user sees:** "With love" text, an elegant masking frame (e.g., floral heart), an auto-rotating carousel of 3 memories inside the mask, ending with the couple's names.
*   **Required Assets:** Frame mask image (PNG with transparency), 3-5 carousel images.
*   **Mandatory Behaviors:** Slow, cross-fading carousel transition (e.g., every 3.5s).

---

## 4. HUMAN INPUTS (Required Checklist)
To recreate this site, a human MUST provide the following assets and data. Everything else is structural logic.

*   [ ] **Hero Video:** 9:16 aspect ratio, cinematic opening, visually resolving to a clear layout by 5.0 seconds. High compression, < 3MB.
*   [ ] **Hero Poster Image:** Exact first frame of the hero video to ensure a seamless transition when the video starts.
*   [ ] **Sacred Composition Image:** High-quality PNG or JPEG for Section 1.
*   [ ] **Couple Names:** Exact spelling and styling preference.
*   [ ] **Ceremony Background Image:** High-quality image for Section 2 (Pheras).
*   [ ] **Event Images:** 5 distinct background images (Haldi, Mehendi, Sangeet, Wedding, Reception).
*   [ ] **Event Metadata:** Date, Time, Venue Name, and City for all 5 events.
*   [ ] **Audio Track:** MP3 format, properly normalized volume, ~1-2 minutes in length, appropriate emotional tone.
*   [ ] **Frame Mask Image:** A PNG with a transparent cutout (e.g., a heart shape) for the final carousel.
*   [ ] **Carousel Memories:** 3 specific photos of the couple to rotate in the final section.

---

## 5. LOADING & PERFORMANCE STRATEGY
Performance is dictated by the "Preload on Hero Start" logic to ensure a zero-latency feel.

*   **First Load (Immediate):** The Hero component mounts natively. The `Hero Poster Image` and the initial CSS load immediately. There is no white screen. The CTA button is ready instantly.
*   **NEVER Load Before Hero:** The heavy event assets (5+ full-screen images) and Global Audio must NOT be requested by the browser on initial page load, to prevent competing for bandwidth with the critical Hero Poster and Video metadata.
*   **The Preload Trigger (Hero Started):** The exact millisecond the user taps and the video registers its `onPlay` event, a tiered background preloading sequence begins:
    *   **Tier 1:** Fetch Section 1 Sacred Composition.
    *   **Tier 2:** Fetch Section 2 Ceremony Image.
    *   **Tier 3:** Fetch all Event Backgrounds and Carousel images in parallel.
*   **Section Rendering Gate (Hero Done):** The React component tree explicitly blocks `<Section1>` through `<Section5>` from mounting in the DOM until the `heroDone` state is true (when the video fades out).
*   **Why this sequencing exists:** By the time the 8-second video finishes, the browser has quietly downloaded all the heavy imagery. When the video dissolves and the full site renders, the user experiences a fully cached, instantaneous scroll without seeing images pop in or layout shifts.

---

## 6. INTERACTION & STATE MODEL
*   **Initial Load:** State = `Waiting`. Site is locked. UI displays only the Poster and CTA. Audio object is dormant.
*   **Hero Ready:** State = `CanPlay`. Browser confirms enough video data exists to begin playback. CTA remains.
*   **Hero Playing:** State = `Playing`. CTA fades out. Video plays. Audio begins synchronous playback directly tied to the user tap.
*   **Hero Started (Data Phase):** State = `heroStarted`. Triggers the `App.tsx` global preload sequence while the video commands visual attention.
*   **Hero Completed:** State = `heroDone`. The hero layer fades its opacity to 0 and is removed from the DOM. The scrollable content layer (Sections 1-5) is mounted.
*   **Post-Hero Scroll Experience:** State = `Scrollable`. The `phone-canvas` element receives `overflow-y: scroll`. Scroll-snap physics engage. Sections apply intersection observers to trigger one-time animations (e.g., particles) as they enter the viewport.

---

## 7. DESIGN SYSTEM RULES
*   **Visual Tone:** Modern, Minimal, Luxury. Deep emphasis on negative space and clean lines.
*   **Typography Roles:**
    *   *Display Font:* Elegant serif or refined script. Used exclusively for Names, Event Titles (e.g., "Haldi"), and high-impact declarations.
    *   *Body Font:* Clean, geometric sans-serif (e.g., Inter or strictly spaced sans). Used for dates, times, locations, and minimalist UI buttons. ALWAYS uppercase with wide tracking (letter-spacing: 0.05em+).
*   **Animation Philosophy:** Soft, restrained, deeply calculated. Fade-ins should take 0.5s to 0.7s. Transforms should use `ease-out` or `cubic-bezier`. No bouncy physics, no aggressive zooming, no chaotic parallax.
*   **Strict Prohibitions:** No drop shadows on text, no harsh borders, no "cluttered" sticky headers, no default blue hyperlinks.

---

## 8. AUDIO RULES
*   **Loading:** The audio `src` must NOT be attached to the `<audio>` element until the user explicitly interacts with the page.
*   **Playback:** Playback MUST be triggered in the direct event handler of the user's first tap (the "Tap to Reveal" button). This satisfies iOS Safari's strict anti-autoplay mechanics.
*   **Cross-Component Management:** A global `AudioPlayer` component handles fade-ins (0 to full volume over ~2-4 seconds) and fade-outs to ensure audio never abruptly starts or stops.
*   **Lifecycle:** Audio persists through the entire scroll experience.

---

## 9. RESPONSIVE & DEVICE RULES
*   **Mobile-First Definition:** Every section is designed against a strict 9:16 aspect ratio (portrait phone). Viewport units (`vh`, `dvh`, `vw`) govern spacing.
*   **Desktop Behavior (Centered Canvas):** On wider screens (tablets, laptops), the application restricts its maximum width (e.g., 450px) and centers itself in the screen (`margin: 0 auto`).
*   **Desktop Background:** The blank space outside the `phone-canvas` must be filled with a sophisticated backdrop—either a heavily blurred version of the active content or a dark, elegant vignette.
*   **Viewport Handling:** Uses `max-height: 100dvh` to respect mobile browser chrome (address bars appearing/disappearing) without breaking scroll snapping.

---

## 10. REPLICATION MODE (How to recreate using AI)

**How to recreate this website using a new AI tool:**

**Step 1:** Collect Human Inputs. Gather every asset listed in the "HUMAN INPUTS" checklist above. Ensure the video is 9:16 and the images are optimized for web.

**Step 2:** Feed this Blueprint. Provide this entire document to the AI engineering agent as its strict architectural constraint and system prompt.

**Step 3:** Instruct the AI. Use the following prompt format:
> "Build a React + Vite web application using vanilla CSS. Strictly follow the attached 'Modern Minimal Luxury Wedding PRD'. I will provide the assets. Do not deviate from the Loading Strategy, State Model, or Design System Rules defined in the document. Implement the 5 exact sections listed, plus the Hero Reveal and RSVP."

**What should stay identical:**
*   The State Model (`heroStarted`, `heroDone`, Preload logic).
*   The exact DOM mounting logic (Sections 1-5 do not exist in the DOM until the video is done).
*   The audio triggering logic (must fire on the first native click).
*   The scroll-snap architecture and `100dvh` constraints.

**What is allowed to vary:**
*   The specific CSS Hex colors (these should be derived from the provided event background images).
*   The specific Google Fonts chosen (so long as they honor the Display vs Body rules).
*   The specific particle coordinates (can be randomized based on the new aesthetic).
