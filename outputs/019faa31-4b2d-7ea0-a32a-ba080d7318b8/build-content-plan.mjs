import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/019faa31-4b2d-7ea0-a32a-ba080d7318b8");
await fs.mkdir(outputDir, { recursive: true });

const C = {
  ivory: "#FFFAF0",
  paper: "#FFFDF8",
  maroon: "#7A1D2C",
  maroonDark: "#54131E",
  gold: "#B58A3C",
  goldLight: "#E8D5AE",
  ink: "#2B1C1F",
  muted: "#6E5B5E",
  line: "#D9C9BC",
  green: "#2D6A4F",
  amber: "#C67C1E",
  red: "#A63A46",
  blue: "#315C8A",
  white: "#FFFFFF",
};

const statusValues = [
  "Not Started",
  "Waiting for Assets",
  "Ready for Flow",
  "Generating",
  "Editing",
  "Review",
  "Approved",
  "Scheduled",
  "Published",
];
const ownerValues = ["Founder", "Codex / Content Head", "Flow Agent", "Editor"];
const priorityValues = ["Critical", "High", "Medium", "Low"];

const posts = [
  {
    id: "P01",
    day: 1,
    format: "Reel",
    funnel: "Awareness",
    objective: "Reframe a wedding invitation as an experience, not a file.",
    title: "Why is your invitation still just a PDF?",
    hook: "Ab shaadi ka invitation sirf PDF kyun ho?",
    presenter: "@NyotaHost",
    script: "Ab shaadi ka invitation sirf PDF kyun ho? Give your guests an experience they will actually remember.",
    proof: "WS-01 Classic Envelope opening; WS-08 full invite scroll",
    duration: "15 sec: host 0-6, product 6-13, CTA 13-15",
    overlay: "Not just an invite. An experience.",
    cta: "See the full experience — link in bio",
    caption: "Lead with the emotional difference between receiving a static file and entering a wedding world.",
    inputs: "CHAR-01; WS-01; WS-08; AS-01; AS-02",
    notes: "First launch post. Pin after publishing.",
    direction: "Warm direct-to-camera delivery. Begin with a small questioning expression, then a confident smile. Ivory interior with a restrained antique-gold accent. End with an open-palm handoff toward the product capture.",
  },
  {
    id: "P02",
    day: 2,
    format: "Reel",
    funnel: "Consideration",
    objective: "Show the complete mobile guest journey.",
    title: "What your guest actually experiences",
    hook: "This is what happens after your guest taps the link.",
    presenter: "@NyotaHost",
    script: "This is what your guests experience when they open a Shaadi Nyota invitation.",
    proof: "WS-01 opening; WS-04 Our Story; WS-05 events; WS-07 closing gallery",
    duration: "18 sec: host 0-5, product 5-16, CTA 16-18",
    overlay: "Opening → Story → Events → Gallery",
    cta: "Save this for your wedding planning",
    caption: "A guided product tour from first tap to final gallery.",
    inputs: "CHAR-01; WS-01; WS-04; WS-05; WS-07",
    notes: "Use real UI in chronological order.",
    direction: "Calm, welcoming delivery. Medium close-up, subtle forward camera move, clean cream background. Finish by looking toward screen-right so the edit can wipe into the phone capture.",
  },
  {
    id: "P03",
    day: 3,
    format: "Carousel",
    funnel: "Awareness",
    objective: "Create a saveable comparison that makes the category difference obvious.",
    title: "PDF vs wedding website",
    hook: "PDF tells. A wedding website welcomes.",
    presenter: "Editorial brand layout",
    script: "7 slides: Hook; ceremonial opening; one scrollable story; event sections; personalized links; RSVP dashboard on RSVP plan; closing question and CTA.",
    proof: "WS-01; WS-04; WS-05; WS-12; WS-15",
    duration: "7 slides, 1080 × 1350",
    overlay: "PDF vs Wedding Website",
    cta: "Which one would your guests remember?",
    caption: "Compare utility and guest experience without insulting traditional print invitations.",
    inputs: "WS-01; WS-04; WS-05; WS-12; WS-15; AS-01",
    notes: "Use product screenshots inside consistent phone frames.",
  },
  {
    id: "P04",
    day: 4,
    format: "Reel",
    funnel: "Consideration",
    objective: "Show that every Indian wedding function can have its own mood.",
    title: "One wedding. Many worlds.",
    hook: "Haldi, Mehendi, Sangeet, Wedding — every function deserves its own mood.",
    presenter: "@NyotaHost",
    script: "Haldi, Mehendi, Sangeet, wedding — every function can have its own mood.",
    proof: "WS-05 event montage; WS-06 event details and actions",
    duration: "17 sec: host 0-6, product 6-15, CTA 15-17",
    overlay: "Every function, beautifully introduced",
    cta: "Comment your favorite function",
    caption: "Celebrate the visual variety of Indian wedding functions while showing one coherent invitation.",
    inputs: "CHAR-01; WS-05; WS-06",
    notes: "Cut event changes on music beats.",
    direction: "Playful but premium. A slight rhythmic count on fingers for the functions. Warm daylight; no busy wedding set behind the host. End with an energetic hand sweep into the event montage.",
  },
  {
    id: "P05",
    day: 5,
    format: "Reel",
    funnel: "Consideration",
    objective: "Demonstrate guest-wise event visibility and personalized links.",
    title: "The right events for the right guest",
    hook: "Har guest ko har function ka invite nahi jaata.",
    presenter: "@NyotaHost",
    script: "Har guest ko har function ka invite nahi jaata. Show the right events to the right guest.",
    proof: "WS-12 assign event visibility; WS-13 compare personalized previews",
    duration: "18 sec: host 0-7, product 7-16, CTA 16-18",
    overlay: "Personalized links. Guest-wise events.",
    cta: "DM “RSVP” to see how it works",
    caption: "Explain a real planning problem and immediately prove the solution.",
    inputs: "CHAR-01; WS-12; WS-13",
    notes: "RSVP Management plan only. Say that in caption.",
    direction: "Confidential, helpful tone as if sharing a clever planning shortcut. Medium shot, minimal cream studio, small knowing smile. Use a clean point-to-screen transition.",
  },
  {
    id: "P06",
    day: 6,
    format: "Carousel",
    funnel: "Education",
    objective: "Give planners a practical invitation-content checklist.",
    title: "What every digital wedding invitation needs",
    hook: "Before you send the link, check these 7 things.",
    presenter: "Editorial checklist layout",
    script: "7 slides: Couple and date; ceremony schedule; venue and map actions; story and photos; guest action buttons; RSVP plan; final mobile preview.",
    proof: "WS-04; WS-05; WS-06; WS-07; WS-14",
    duration: "7 slides, 1080 × 1350",
    overlay: "The digital invitation checklist",
    cta: "Save this before you build yours",
    caption: "High-save educational post with Shaadi Nyota shown as the natural implementation.",
    inputs: "WS-04; WS-05; WS-06; WS-07; WS-14; AS-01",
    notes: "Keep every slide to one idea.",
  },
  {
    id: "P07",
    day: 7,
    format: "Reel",
    funnel: "Consideration",
    objective: "Show the RSVP workflow and dashboard value.",
    title: "Stop collecting RSVPs manually",
    hook: "Still asking everyone on WhatsApp if they are coming?",
    presenter: "@NyotaHost",
    script: "Still asking everyone on WhatsApp if they are coming? Let guests RSVP from the invitation itself.",
    proof: "WS-14 guest RSVP submit; WS-15 RSVP dashboard metrics",
    duration: "18 sec: host 0-7, product 7-16, CTA 16-18",
    overlay: "Guest response → Dashboard update",
    cta: "See RSVP Management — link in bio",
    caption: "Pain-to-proof format: manual follow-ups versus one guest action and one dashboard.",
    inputs: "CHAR-01; WS-14; WS-15",
    notes: "RSVP Management plan only.",
    direction: "Open with mild exasperation, then relax into a solution-focused smile. Clean mid-shot, phone in hand but no readable third-party app interface. Transition by lowering the phone into the real RSVP capture.",
  },
  {
    id: "P08",
    day: 8,
    format: "Reel",
    funnel: "Trust",
    objective: "Reduce purchase anxiety by proving the preview-before-payment flow.",
    title: "Build first. Preview before paying.",
    hook: "You should see your wedding website before you pay for it.",
    presenter: "@NyotaHost",
    script: "Start with your names and events, customize every section, and preview the entire website before paying.",
    proof: "WS-09 create wedding; WS-10 customize and preview",
    duration: "18 sec: host 0-7, product 7-16, CTA 16-18",
    overlay: "Build → Customize → Preview",
    cta: "Start your preview",
    caption: "Trust-building product process. Clarify that publishing follows manual payment verification.",
    inputs: "CHAR-01; WS-09; WS-10",
    notes: "Do not imply instant publishing. Caption: live after verification, normally 24–48 hours.",
    direction: "Confident and reassuring. Soft daylight, premium cream setting, steady eye contact. Use three small finger counts for build, customize, preview; match-cut the third count to the Preview tab.",
  },
  {
    id: "P09",
    day: 9,
    format: "Carousel",
    funnel: "Conversion",
    objective: "Make plan selection simple and transparent.",
    title: "Basic Website vs Website + RSVP",
    hook: "Choose the plan that matches your guest list.",
    presenter: "Premium comparison layout",
    script: "7 slides: Choice hook; Basic ₹3,000; Basic inclusions; Website + RSVP ₹5,000; RSVP inclusions; who each plan suits; preview-before-payment CTA.",
    proof: "WS-16 pricing; WS-15 dashboard; WS-12 guest visibility",
    duration: "7 slides, 1080 × 1350",
    overlay: "₹3,000 Basic | ₹5,000 Website + RSVP",
    cta: "Save this comparison or start your preview",
    caption: "Transparent pricing post using only current website claims.",
    inputs: "WS-16; WS-15; WS-12; AS-01",
    notes: "Manual verification; website reviewed and made live within 24–48 hours after payment.",
  },
  {
    id: "P10",
    day: 10,
    format: "Reel",
    funnel: "Conversion",
    objective: "Anchor the current entry price and plan difference.",
    title: "What does a Shaadi Nyota website cost?",
    hook: "A premium wedding website starts at three thousand rupees.",
    presenter: "@NyotaHost",
    script: "A premium wedding website starts at three thousand rupees, with RSVP management available in the five-thousand-rupee plan.",
    proof: "WS-16 pricing; WS-08 finished invite; WS-15 RSVP dashboard",
    duration: "17 sec: host 0-7, product 7-15, CTA 15-17",
    overlay: "Basic ₹3,000 | Website + RSVP ₹5,000",
    cta: "Compare plans — link in bio",
    caption: "Price-led conversion post with inclusions and manual-verification expectation in the caption.",
    inputs: "CHAR-01; WS-16; WS-08; WS-15",
    notes: "Reconfirm prices before publishing if the website changes.",
    direction: "Straightforward, transparent delivery. No salesy excitement. Host beside generous negative space reserved for price overlays; elegant ivory and maroon styling. End with a subtle nod into the pricing capture.",
  },
  {
    id: "P11",
    day: 11,
    format: "Reel",
    funnel: "Engagement",
    objective: "Invite preference comments while displaying three opening styles.",
    title: "Choose your opening mood",
    hook: "Envelope, royal scroll, or palace doors?",
    presenter: "@NyotaHost",
    script: "Envelope, royal scroll, or palace doors — what should your wedding invitation feel like?",
    proof: "WS-01 classic envelope; WS-02 scroll; WS-03 palace door",
    duration: "18 sec: host 0-6, products 6-16, CTA 16-18",
    overlay: "1 Envelope | 2 Scroll | 3 Palace",
    cta: "Comment 1, 2, or 3",
    caption: "A simple engagement prompt that also demonstrates real template variety.",
    inputs: "CHAR-01; WS-01; WS-02; WS-03",
    notes: "Give every opening equal screen time.",
    direction: "Inviting game-show energy without becoming loud. Host uses three clear hand counts. Neutral cream set, centered framing, quick smile. Cut each finger count to the corresponding real opening.",
  },
  {
    id: "P12",
    day: 12,
    format: "Carousel",
    funnel: "Trust",
    objective: "Answer high-intent objections in a saveable format.",
    title: "Questions couples ask before creating their site",
    hook: "Can I customize it? Can guests RSVP? Can I preview first?",
    presenter: "Editorial FAQ layout",
    script: "7 slides: FAQ hook; customize sections; use own visuals where supported; choose event-wise guests on RSVP plan; preview before paying; manual payment process; CTA.",
    proof: "WS-10; WS-12; WS-14; WS-16",
    duration: "7 slides, 1080 × 1350",
    overlay: "Shaadi Nyota FAQ",
    cta: "Comment your question or start a preview",
    caption: "Answer only what the current product supports; route unusual requirements to WhatsApp.",
    inputs: "WS-10; WS-12; WS-14; WS-16; AS-02",
    notes: "Do not promise unsupported custom development.",
  },
  {
    id: "P13",
    day: 13,
    format: "Reel",
    funnel: "Awareness",
    objective: "Position the mobile link as ideal for distributed guest lists.",
    title: "One link for guests everywhere",
    hook: "Your guests may be in ten cities. Your invitation can still feel like one experience.",
    presenter: "@NyotaHost",
    script: "One wedding, guests across cities and countries — one beautiful mobile link works everywhere.",
    proof: "WS-08 mobile invite scroll; WS-13 personalized previews",
    duration: "16 sec: host 0-6, product 6-14, CTA 14-16",
    overlay: "One beautiful mobile link",
    cta: "Send this to an NRI couple",
    caption: "Speak to NRI, destination, and multi-city families without making technical delivery claims.",
    inputs: "CHAR-01; WS-08; WS-13",
    notes: "Use subtle city-name motion graphics, not fake delivery analytics.",
    direction: "Warm, expansive delivery with a light outward gesture. Sophisticated neutral backdrop with very subtle travel cues, no landmarks. Transition to the real phone experience with a gentle push-in.",
  },
  {
    id: "P14",
    day: 14,
    format: "Reel",
    funnel: "Conversion",
    objective: "Summarize the strongest value proposition in one proof-heavy Reel.",
    title: "Your invitation and RSVP system, together",
    hook: "Beautiful for guests. Organized for the family.",
    presenter: "@NyotaHost",
    script: "A cinematic invitation, personalized guest links, and every RSVP in one place. That is Shaadi Nyota.",
    proof: "WS-01; WS-13; WS-15; WS-07",
    duration: "18 sec: host 0-7, product 7-16, CTA 16-18",
    overlay: "Beautiful outside. Organized inside.",
    cta: "Create your wedding website",
    caption: "Campaign recap built from the best-performing proof clips.",
    inputs: "CHAR-01; WS-01; WS-13; WS-15; WS-07",
    notes: "Pin if this becomes the clearest brand explainer.",
    direction: "Flagship brand delivery: composed, memorable, premium. Medium close-up, controlled slow push-in, ivory outfit and maroon accent. End with a confident stillness before the product montage.",
  },
  {
    id: "P15",
    day: 15,
    format: "Carousel",
    funnel: "Conversion",
    objective: "Turn interest into a simple start-to-share process.",
    title: "From first draft to guest link",
    hook: "Your wedding website starts with seven simple decisions.",
    presenter: "Step-by-step editorial layout",
    script: "7 slides: Choose opening; add couple details; add story; add functions; customize visuals/music/closing; preview and choose plan; complete manual verification and share.",
    proof: "WS-09; WS-10; WS-08; WS-16",
    duration: "7 slides, 1080 × 1350",
    overlay: "Your 7-step website plan",
    cta: "Start your preview — link in bio",
    caption: "Practical closing post that converts planning anxiety into an achievable sequence.",
    inputs: "WS-09; WS-10; WS-08; WS-16; AS-02",
    notes: "State live timing accurately: reviewed and made live within 24–48 hours after payment verification request.",
  },
];

const recordings = [
  ["WS-01", "Classic Envelope — full opening", "/templates/classic-envelope", "Start on the closed envelope. Tap once, let the reveal complete, hold the first invite screen for one second.", "9:16", "6–8 sec", "Phone capture; no cursor, notifications, address bar, captions, or music.", "P01, P02, P03, P11, P14", "WS-01_classic-envelope-opening_v1.mp4", "Critical", "Founder", "Not Started", "Capture the full motion; do not speed-ramp."],
  ["WS-02", "Scroll Opening — full reveal", "/templates/scroll-opening", "Start on the rolled scroll. Trigger the opening, let it fully unroll, hold the first invite screen.", "9:16", "6–8 sec", "Same device size and brightness as WS-01.", "P11", "WS-02_scroll-opening_v1.mp4", "High", "Founder", "Not Started", "Match WS-01 timing."],
  ["WS-03", "Palace Door — full reveal", "/templates/palace-door-opening", "Start on closed palace doors. Tap, let the doors open fully, hold the first invite screen.", "9:16", "6–8 sec", "Same device size and brightness as WS-01.", "P11", "WS-03_palace-door-opening_v1.mp4", "High", "Founder", "Not Started", "Match WS-01 timing."],
  ["WS-04", "Our Story section", "Any polished demo invite", "Begin just before Our Story and scroll slowly through the section in one continuous move.", "9:16", "4–6 sec", "Use polished demo names/photos only; no personal data.", "P02, P03, P06", "WS-04_our-story-scroll_v1.mp4", "High", "Founder", "Not Started", "Show the section title and at least two story moments."],
  ["WS-05", "Event-section montage", "Any polished demo invite", "Capture Haldi, Mehendi, Sangeet, Wedding, and Reception section transitions as separate clean clips or one controlled scroll.", "9:16", "8–10 sec", "Keep every event readable for at least one second.", "P02, P03, P04, P06", "WS-05_event-sections-montage_v1.mp4", "Critical", "Founder", "Not Started", "Separate source clips are preferable for editing."],
  ["WS-06", "Event details and guest actions", "Any event detail screen", "Reveal date, time, venue, and available action buttons; tap one safe demo action only if it does not leave the site.", "9:16", "4–6 sec", "Do not expose a private address or phone number.", "P04, P06", "WS-06_event-details-actions_v1.mp4", "Medium", "Founder", "Not Started", "Map/calendar/action buttons are visual proof."],
  ["WS-07", "Closing Gallery", "Any polished demo invite", "Scroll smoothly into the closing/gallery section; hold on the strongest composition.", "9:16", "4–6 sec", "Use licensed or project-owned demo imagery.", "P02, P06, P14", "WS-07_closing-gallery_v1.mp4", "High", "Founder", "Not Started", "No abrupt end."],
  ["WS-08", "Complete mobile invite journey", "Best current demo invite", "Record a clean top-to-bottom journey: opening, couple, story, events, closing. Make a 15-second source plus a tighter 10-second version.", "9:16", "10–15 sec", "One steady gesture; no overscroll or bounce.", "P01, P10, P13, P15", "WS-08_full-mobile-invite_v1.mp4", "Critical", "Founder", "Not Started", "Master proof clip for the campaign."],
  ["WS-09", "Create-wedding setup", "/create-wedding", "Enter clean demo couple details and proceed until the dashboard loads.", "9:16", "6–8 sec", "Use fictional data. Hide email, account, and payment information.", "P08, P15", "WS-09_create-wedding-setup_v1.mp4", "High", "Founder", "Not Started", "Only show the shortest believable path."],
  ["WS-10", "Customize and Preview", "Dashboard: Opening, Story, Events, Preview", "Make one visible edit, save it, open Preview, and show that the real guest experience reflects the edit.", "9:16", "8–10 sec", "The before/after must be obvious without zooming into private fields.", "P08, P12, P15", "WS-10_customize-preview_v1.mp4", "Critical", "Founder", "Not Started", "Use the actual dashboard Preview experience."],
  ["WS-11", "Guest list management", "Dashboard: Guests", "Add one fictional family/guest, show the row appearing, then use search or filter once.", "9:16", "5–7 sec", "No real guest names, phones, or emails.", "Supporting / future", "WS-11_guest-list_v1.mp4", "Medium", "Founder", "Not Started", "Keep as a reusable proof asset."],
  ["WS-12", "Assign event-wise visibility", "Dashboard: Guests", "Open one fictional guest/family, select only specific events, save, and show the resulting event assignment.", "9:16", "6–8 sec", "Use obvious demo event names; no personal data.", "P03, P05, P09, P12", "WS-12_event-wise-visibility_v1.mp4", "Critical", "Founder", "Not Started", "RSVP Management plan proof."],
  ["WS-13", "Compare personalized guest previews", "Dashboard guest links / Preview", "Open two fictional personalized links or previews side by side/sequentially so their visible events clearly differ.", "9:16", "8–10 sec", "Keep URLs and guest identifiers hidden or fictional.", "P05, P13, P14", "WS-13_personalized-preview-comparison_v1.mp4", "Critical", "Founder", "Not Started", "The difference must be visible in the recording."],
  ["WS-14", "Guest RSVP submission", "Personalized guest invite", "From the invitation, open RSVP, select a response and meal preference if shown, submit, then hold the confirmation state.", "9:16", "6–8 sec", "Use a fictional guest and demo data.", "P06, P07, P12", "WS-14_guest-rsvp-submit_v1.mp4", "Critical", "Founder", "Not Started", "Capture the complete action in one take."],
  ["WS-15", "RSVP Dashboard update", "Dashboard: RSVP Dashboard", "Show confirmed/maybe/declined/pending metrics, families, meals, and event summaries. If possible, reflect the demo response from WS-14.", "9:16", "6–8 sec", "Use demo data with enough rows to look credible, never real data.", "P03, P07, P09, P10, P14", "WS-15_rsvp-dashboard-metrics_v1.mp4", "Critical", "Founder", "Not Started", "Move slowly enough to read the KPI cards."],
  ["WS-16", "Pricing and plan comparison", "Homepage: Pricing", "Scroll into pricing and hold on Basic ₹3,000 and Website + RSVP ₹5,000 with inclusions visible.", "9:16", "4–6 sec", "Capture again whenever pricing changes.", "P09, P10, P12, P15", "WS-16_pricing-plans_v1.mp4", "Critical", "Founder", "Not Started", "Current source of truth for price claims."],
];

const characterRows = [
  ["CHAR-01", "@NyotaHost", "Primary recurring campaign host", "Indian woman, late 20s; warm expressive face; long dark wavy hair; subtle makeup; small bindi; premium but relatable.", "Ivory kurta with restrained antique-gold embroidery. Keep the same signature outfit for the first 15 posts.", "Warm Indian-English voice with light natural Hinglish; 155–165 wpm; clear, confident, never salesy.", "Direct, helpful, culturally fluent, calm confidence, light humor only when scripted.", "Medium close-up; eye-level; soft warm daylight; simple cream interior; subtle maroon/gold accent; clean handoff gesture into product proof.", "Use two clean reference frames: front-facing mid-shot and 3/4 smiling view. Reuse the same character and voice on every Reel.", "No heavy jewelry, bridal costume, loud gestures, fake phone UI, influencer slang, fast speech, or changing facial identity.", "Required", "Founder", "Not Started"],
  ["CHAR-02", "@me Founder", "Optional founder trust/avatar appearances after launch", "Use only the founder's own authorized visual likeness and audio likeness created through Flow Avatar.", "Simple solid shirt or kurta in ivory, maroon, charcoal, or navy. Keep founder styling recognizably real.", "Founder’s natural voice; concise, candid, slower than the host; no synthetic testimonial claims.", "Behind-the-scenes, product decisions, launch story, personal reassurance.", "Natural office/home setting, eye-level, clean audio. Use for 1 in every 5–7 future videos, not the first launch batch unless desired.", "Create through the official mobile QR/avatar flow. Mention @me in prompts once available.", "Never imitate another person, over-polish the founder’s appearance, or use the avatar for customer testimonials.", "Optional", "Founder", "Not Started"],
];

const assets = [
  ["AS-01", "Brand", "Transparent Shaadi Nyota logo", "Covers, end cards, and carousel lockups", "PNG or SVG, transparent, high resolution", "Founder", "Critical", "", "Not Started", "", "All posts", "Use the real brand mark only."],
  ["AS-02", "Brand", "Primary destination URL and final Instagram CTA", "Every caption and end card needs one consistent action", "Exact URL plus chosen wording", "Founder", "Critical", "", "Not Started", "", "All posts", "Recommended CTA: Start your preview."],
  ["AS-03", "Character", "@NyotaHost front-facing reference", "Character creation and identity lock", "Sharp 4:5 or 9:16 image, eye-level, neutral expression", "Founder / Flow", "Critical", "", "Not Started", "", "All Reels", "Can be generated from the established video look."],
  ["AS-04", "Character", "@NyotaHost 3/4 smiling reference", "Improves character consistency across angles", "Sharp 4:5 or 9:16 image, same hair/outfit/light", "Founder / Flow", "Critical", "", "Not Started", "", "All Reels", "Do not change jewelry or embroidery."],
  ["AS-05", "Voice", "@NyotaHost voice selection or sample", "Stable recognizable host voice", "Custom voice if available; otherwise document selected Flow voice", "Founder / Flow", "High", "", "Not Started", "", "All Reels", "Test Hindi names and ₹ prices before locking."],
  ["AS-06", "Reference", "Existing presenter video 1", "Starting point for host identity and pacing", "Original MP4", "Founder", "High", "", "Available", "marketing/reels/video 1.mp4", "Character setup", "Use as reference; future product half must be real UI."],
  ["AS-07", "Product", "Classic Envelope recording", "Core opening proof", "See WS-01", "Founder", "Critical", "", "Not Started", "", "P01, P02, P03, P11, P14", ""],
  ["AS-08", "Product", "Scroll Opening recording", "Template-choice proof", "See WS-02", "Founder", "High", "", "Not Started", "", "P11", ""],
  ["AS-09", "Product", "Palace Door recording", "Template-choice proof", "See WS-03", "Founder", "High", "", "Not Started", "", "P11", ""],
  ["AS-10", "Product", "Complete guest experience recordings", "Story, events, gallery, and full-scroll proof", "See WS-04 through WS-08", "Founder", "Critical", "", "Not Started", "", "P01–P06, P10, P13–P15", "Capture these before dashboard clips if time is limited."],
  ["AS-11", "Product", "Builder and preview recordings", "Demonstrate setup and preview-before-payment", "See WS-09 and WS-10", "Founder", "Critical", "", "Not Started", "", "P08, P12, P15", ""],
  ["AS-12", "Product", "Guest and RSVP recordings", "Prove plan-specific workflow", "See WS-11 through WS-15", "Founder", "Critical", "", "Not Started", "", "P03, P05, P07, P09–P14", "Use fictional guest data."],
  ["AS-13", "Product", "Pricing recording", "Source of truth for price-led posts", "See WS-16", "Founder", "Critical", "", "Not Started", "", "P09, P10, P12, P15", "Refresh if pricing changes."],
  ["AS-14", "Copy", "Instagram handle", "End cards, cover footer, captions", "Final @handle", "Founder", "High", "", "Not Started", "", "All posts", "Can remain blank until account creation."],
  ["AS-15", "Copy", "Launch date", "Populates the 15-day publishing calendar", "Date", "Founder", "High", "", "Not Started", "", "Calendar", "Enter on 00 Strategy!B6."],
  ["AS-16", "Audio", "Licensed signature music bed", "Campaign recognition across Reels", "15–25 sec instrumental; culturally warm; usable on Instagram", "Founder / Editor", "Medium", "", "Not Started", "", "All Reels", "Presenter voice must remain dominant."],
  ["AS-17", "Data", "Clean fictional demo wedding", "Consistent names, dates, events, guests, and RSVP data", "One complete seeded demo account", "Founder", "Critical", "", "Not Started", "", "All product captures", "Never mix multiple couples within one Reel."],
  ["AS-18", "Tracking", "UTM link or link-in-bio destination", "Measure profile and content conversion", "Trackable URL", "Founder", "Medium", "", "Not Started", "", "All conversion posts", "Use one campaign convention for all 15 posts."],
  ["AS-19", "Policy", "Approved claim list", "Prevents invented guarantees, testimonials, or features", "Current website copy and plan details", "Codex / Content Head", "High", "", "Ready", "", "All posts", "This workbook already encodes the current claim boundary."],
  ["AS-20", "Optional", "Founder Avatar @me", "Future trust and behind-the-scenes content", "Flow Avatar setup using founder’s authorized likeness/voice", "Founder", "Low", "", "Not Started", "", "Future posts", "Not required for the first 15."],
];

function finalSequence(post) {
  if (post.format === "Carousel") {
    return "Slides 1–7: hook → five proof/education slides → CTA. Use one consistent grid, page number, and brand lockup.";
  }
  const proofIds = [...post.proof.matchAll(/WS-\d{2}/g)].map((m) => m[0]);
  return `0–${post.id === "P05" || post.id === "P07" || post.id === "P08" || post.id === "P10" || post.id === "P14" ? "7" : "6"} sec: chosen @NyotaHost take. Then assemble ${proofIds.join(" → ")} unchanged. Final 2 sec: ${post.cta}.`;
}

function reelPrompt(post) {
  const proofIds = [...post.proof.matchAll(/WS-\d{2}/g)].map((m) => m[0]).join(", ");
  return `PROJECT: Shaadi Nyota — Launch 15
POST: ${post.id} — ${post.title}

Use @NyotaHost and the project Agent Instructions. Create three presenter takes for a vertical Instagram Reel. Each presenter take must be 9:16 and ${post.script.split(" ").length > 18 ? "8" : "6"} seconds with synchronized speech.

SAY THESE EXACT WORDS:
“${post.script}”

PERFORMANCE AND CAMERA:
${post.direction}
Keep the host’s face, hair, ivory-and-gold outfit, voice, age, and skin tone consistent with the approved character. Frame for Instagram safe zones. Do not put readable text, a fake phone screen, a logo, or a product interface inside the generated presenter clip.

GENERATE AND ORGANIZE:
Generate 3 distinct performance variations named ${post.id}_Host_A, ${post.id}_Host_B, and ${post.id}_Host_C. Variations may change only expression, hand gesture, and micro camera motion. Group them in “Launch 15 / ${post.id}”.

FINAL ASSEMBLY USING SELECTED REAL MEDIA:
After I select one host take, use the selected real product captures ${proofIds} as the product half. Preserve these captures exactly; do not regenerate, restyle, replace, relabel, or hallucinate any interface. Trim only for pacing. Build this sequence in Scenebuilder: ${finalSequence(post)}

EDITING:
Use clean straight cuts or one motivated handoff transition. Keep the presenter voice clean, then lower into a restrained licensed music bed. Add exact typeset captions, not AI-rendered in-scene text. Primary overlay: “${post.overlay}”. End-card CTA: “${post.cta}”.

DELIVERABLE:
One final 1080 × 1920 Reel, H.264, approximately ${post.duration.split(":")[0]}, plus the three presenter source takes. Name the final ${post.id}_Final_v1.

DO NOT:
Do not invent UI, customer counts, testimonials, instant publishing, or new product features. Do not imply RSVP features are in the Basic plan. Do not change current prices. No watermark, bridal costume, loud influencer gestures, excessive jewelry, unreadable typography, or generic stock wedding footage.`;
}

function carouselSlides(post) {
  const slides = {
    P03: [
      "PDF tells. A wedding website welcomes.",
      "1. A ceremonial opening sets the mood before a guest reads a word.",
      "2. Your story, photos, and wedding details live in one mobile journey.",
      "3. Every function gets its own clear, beautiful section.",
      "4. With the RSVP plan, personalized links can show the right events to each guest.",
      "5. Guests respond from the invite; the family tracks responses in the dashboard.",
      "Which one would your guests remember? Explore Shaadi Nyota.",
    ],
    P06: [
      "Before you send the link, check these 7 things.",
      "1. Couple names and the primary wedding date.",
      "2. Every function’s date, time, and sequence.",
      "3. Venue details and useful guest action buttons.",
      "4. Your story and approved photos or visuals.",
      "5. The exact events each guest or family should see.",
      "6. RSVP setup if you need response tracking. 7. A final mobile preview.",
      "Save this checklist before you build your invitation.",
    ],
    P09: [
      "Which Shaadi Nyota plan fits your wedding?",
      "BASIC WEBSITE — ₹3,000",
      "Wedding website, template-based design, Opening Reveal, Our Story, event details, Closing Gallery, shareable link, and basic dashboard editing.",
      "WEBSITE + RSVP MANAGEMENT — ₹5,000",
      "Everything in Basic, plus RSVP form, guest list management, personalized links, event-wise guest invites, and response tracking.",
      "Choose Basic for one beautiful public invite. Choose RSVP when guest-wise events and responses matter.",
      "Build and preview before paying. Publishing follows manual payment verification.",
    ],
    P12: [
      "Questions couples ask before creating their site",
      "Can I customize sections? Yes — edit the opening, story, events, music, closing content, and visuals.",
      "Can I use my own visuals? Choose presets and use supported upload flows where available.",
      "Can different guests see different events? Yes, with the RSVP Management plan.",
      "Can guests RSVP online? Yes, with guest lists, event-wise responses, and dashboard tracking in the RSVP plan.",
      "Can I preview before paying? Yes. Payment is manual; request verification from the dashboard.",
      "Still deciding? Start a preview or ask us on WhatsApp.",
    ],
    P15: [
      "Your wedding website starts with seven simple decisions.",
      "1. Choose the opening mood: envelope, scroll, or palace doors.",
      "2. Add the couple details. 3. Shape the Our Story section.",
      "4. Add every function with the right date, time, venue, and visuals.",
      "5. Customize music, action buttons, and the Closing Gallery.",
      "6. Preview the full guest experience. 7. Choose your plan and complete manual payment verification.",
      "Once reviewed and live, share the public link or RSVP-plan personalized links.",
    ],
  };
  return slides[post.id];
}

function carouselPrompt(post) {
  const slides = carouselSlides(post);
  return `PROJECT: Shaadi Nyota — Launch 15
POST: ${post.id} — ${post.title}

Create a premium 7-slide Instagram carousel at 1080 × 1350 per slide. Use Shaadi Nyota’s exact visual system: warm ivory #FFFAF0, deep maroon #7A1D2C, antique gold #B58A3C, dark ink #2B1C1F, refined editorial serif headlines, clean readable body type, generous negative space, restrained Indian ceremonial details, and the real transparent logo.

Use selected real screenshots from ${post.proof}. Place screenshots inside consistent phone or dashboard frames. Preserve screenshot pixels and interface text exactly. Do not ask an image model to redraw the product.

TYPESET THIS EXACT COPY:
${slides.map((s, i) => `SLIDE ${i + 1}: ${s}`).join("\n")}

LAYOUT SYSTEM:
Slide 1 is a bold cover with one dominant headline. Slides 2–6 each communicate one idea with no more than 32 body words, a small slide number, and one supporting real-product crop or restrained decorative motif. Slide 7 is a clear CTA card. Maintain one grid, one logo position, and one maroon/gold progress marker across the set. Keep all text inside Instagram safe margins and make it readable on a phone.

GENERATE AND ORGANIZE:
Produce two complete visual directions named ${post.id}_Carousel_A and ${post.id}_Carousel_B. Direction A is editorial and spacious. Direction B is slightly more celebratory but still premium. Group all slides in “Launch 15 / ${post.id}”. After selection, export seven ordered PNG files named ${post.id}_S01 through ${post.id}_S07 plus a combined review contact sheet.

DO NOT:
No gradients, fake testimonials, invented statistics, distorted logo, generic bride-and-groom stock imagery, tiny text, AI-written interface text, extra prices, or unsupported claims. Keep Basic and RSVP Management features distinct.`;
}

function refinementPrompt(post) {
  if (post.format === "Carousel") {
    return `Refine ${post.id} only: tighten hierarchy, increase phone-size readability, keep the exact approved copy and real screenshots, align every slide to the same grid, and preserve everything else. Export a fresh ordered set as ${post.id}_Final_v2.`;
  }
  return `Edit ${post.id}_Final_v1 only: keep @NyotaHost’s identity, voice, outfit, dialogue, framing, and every real UI pixel unchanged. Improve only pacing, caption placement, and the handoff into the product capture. Keep everything else the same. Export ${post.id}_Final_v2.`;
}

function acceptance(post) {
  if (post.format === "Carousel") {
    return "7 ordered 1080×1350 slides; exact copy; readable at phone size; consistent grid/logo; real screenshots untouched; product/price claims match the website; CTA visible.";
  }
  return "Host identity/voice consistent; exact dialogue; presenter occupies first half; real UI proof occupies second half; UI remains pixel-accurate; captions readable; CTA clear; no unsupported claim.";
}

function rejection(post) {
  if (post.format === "Carousel") {
    return "Reject for misspelled copy, tiny type, redrawn UI, altered prices, unsupported claims, inconsistent slide system, distorted logo, or generic stock-wedding look.";
  }
  return "Reject for face/voice drift, wrong words, fake UI, generated product screens, changed prices, instant-publish claim, Basic/RSVP confusion, abrupt transition, clipping, or unreadable captions.";
}

const masterInstructions = `You are the creative production agent for SHAADI NYOTA, a premium mobile-first wedding website platform for Indian celebrations.

PRODUCT TRUTHS
• Basic Website — ₹3,000: wedding website, template-based design, Opening Reveal, Our Story, event details, Closing Gallery, public shareable invite link, and basic dashboard editing.
• Website + RSVP Management — ₹5,000: everything in Basic plus RSVP form, guest list management, personalized invite links, event-wise guest invites, and RSVP response tracking.
• Couples can build and preview before paying. Payment is manual. After payment, the user requests verification; the team reviews and makes the website live within 24–48 hours.
• Opening styles currently shown: Classic Envelope, Scroll Opening, and Palace Door Opening.

BRAND WORLD
Warm ivory #FFFAF0, deep maroon #7A1D2C, antique gold #B58A3C, dark ink #2B1C1F. Premium, romantic, calm, culturally fluent, editorial, mobile-first. Never look like a loud wedding marketplace or a generic AI template.

CHARACTER
Use @NyotaHost as the recurring host unless the post explicitly says otherwise. Keep her face, age, skin tone, long dark wavy hair, small bindi, ivory kurta with restrained antique-gold embroidery, and warm Indian-English voice consistent. Light natural Hinglish is allowed only where scripted. Delivery is confident and helpful, never salesy.

REEL STRUCTURE
Every Reel is 9:16. Hook in the first second. Presenter appears in the first half for approximately 4–8 seconds. The second half uses selected REAL Shaadi Nyota website or dashboard captures as proof. Target 14–18 seconds total. Generate three presenter variations before assembly.

PRODUCT-EVIDENCE RULE
Real product captures are the source of truth. Preserve them pixel-for-pixel. Never regenerate, restyle, relabel, translate, or hallucinate the interface. Do not create fake dashboard screens. Trim and sequence real captures only.

COPY AND CLAIMS
Use only copy supplied in the post prompt or these verified truths. Never invent testimonials, customer counts, guarantees, discounts, delivery analytics, or features. Never imply instant publishing. Never place RSVP Management features in the Basic plan.

OUTPUT AND ORGANIZATION
Use collection “Shaadi Nyota — Launch 15” with a subfolder for each Post ID. Name source variations clearly. Keep exact typeset captions within Instagram safe zones. Use simple conversational edits and the phrase “Keep everything else the same” when refining an approved asset.`;

const wb = Workbook.create();
const strategy = wb.worksheets.add("00 Strategy");
const calendar = wb.worksheets.add("01 Content Calendar");
const prompts = wb.worksheets.add("02 Omni Prompts");
const recordingsSheet = wb.worksheets.add("03 Website Recordings");
const characterSheet = wb.worksheets.add("04 Character Bible");
const assetsSheet = wb.worksheets.add("05 Asset Checklist");

function titleBlock(sheet, lastCol, title, subtitle) {
  sheet.showGridLines = false;
  sheet.mergeCells(`A1:${lastCol}1`);
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${lastCol}1`).format = {
    fill: C.maroonDark,
    font: { bold: true, color: C.white, size: 22 },
    verticalAlignment: "center",
  };
  sheet.getRange(`A1:${lastCol}1`).format.rowHeight = 34;
  sheet.mergeCells(`A2:${lastCol}2`);
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${lastCol}2`).format = {
    fill: C.goldLight,
    font: { italic: true, color: C.ink, size: 10 },
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${lastCol}2`).format.rowHeight = 27;
}

function styleHeader(sheet, range) {
  sheet.getRange(range).format = {
    fill: C.maroon,
    font: { bold: true, color: C.white },
    wrapText: true,
    verticalAlignment: "center",
    horizontalAlignment: "left",
    borders: { preset: "all", style: "thin", color: C.goldLight },
  };
}

function styleBody(sheet, range) {
  sheet.getRange(range).format = {
    fill: C.paper,
    font: { color: C.ink, size: 9 },
    wrapText: true,
    verticalAlignment: "top",
    borders: { preset: "all", style: "thin", color: C.line },
  };
}

function addTable(sheet, range, name) {
  const table = sheet.tables.add(range, true, name);
  table.style = "TableStyleMedium2";
  table.showBandedRows = true;
  table.showFilterButton = true;
}

// 00 Strategy
titleBlock(strategy, "H", "SHAADI NYOTA — 15-DAY CONTENT PRODUCTION HQ", "One recurring host. Real product proof. Exact Flow/Omni prompts. No invented UI or claims.");
strategy.getRange("A4:H4").values = [["CAMPAIGN SNAPSHOT", "", "", "", "", "", "", ""]];
strategy.mergeCells("A4:H4");
strategy.getRange("A4:H4").format = { fill: C.maroon, font: { bold: true, color: C.white, size: 12 } };
strategy.getRange("A5:H8").values = [
  ["Total posts", 15, "Reels", 10, "Carousels", 5, "Cadence", "1 post daily"],
  ["Launch date", "", "Primary audience", "Engaged Indian / NRI couples and family decision-makers", "Primary CTA", "Start your preview", "Primary host", "@NyotaHost"],
  ["North-star goal", "Qualified preview starts and WhatsApp enquiries", "Reel pattern", "Presenter first half → real product proof second half", "Content mix", "Awareness, education, trust, conversion", "Feed rule", "Do not publish all Reels consecutively"],
  ["Current prices", "Basic ₹3,000 | Website + RSVP ₹5,000", "Publishing truth", "Manual payment verification; live within 24–48 hours after verification request", "Plan truth", "RSVP features belong to the RSVP Management plan", "Review rule", "Reconfirm pricing before price-led posts"],
];
strategy.getRange("A5:H8").format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: C.line } };
strategy.getRange("A5:H8").format.rowHeight = 45;
strategy.getRange("A5:A8").format = { fill: C.goldLight, font: { bold: true, color: C.maroonDark }, wrapText: true };
strategy.getRange("C5:C8").format = { fill: C.goldLight, font: { bold: true, color: C.maroonDark }, wrapText: true };
strategy.getRange("E5:E8").format = { fill: C.goldLight, font: { bold: true, color: C.maroonDark }, wrapText: true };
strategy.getRange("G5:G8").format = { fill: C.goldLight, font: { bold: true, color: C.maroonDark }, wrapText: true };
strategy.getRange("B6").format.fill = "#FFF0B8";
strategy.getRange("B6").format.numberFormat = "yyyy-mm-dd";
strategy.getRange("A10:D10").merge();
strategy.getRange("A10").values = [["CONTENT-HEAD DIRECTIVE"]];
strategy.getRange("A10:D10").format = { fill: C.maroon, font: { bold: true, color: C.white } };
strategy.getRange("A11:D16").merge();
strategy.getRange("A11").values = [[
  "Lead with the guest experience, prove with the real product, then ask for one simple action.\n\n" +
  "Mix: 10 Reels for reach and demonstration; 5 carousels for saves, objections, and transparent comparisons.\n\n" +
  "Host system: one recognizable @NyotaHost for the launch batch. Add the founder avatar later for behind-the-scenes trust, not as a substitute for product proof.\n\n" +
  "Every asset must answer one question: What will the guest feel, or what planning problem will the couple solve?"
]];
strategy.getRange("A11:D16").format = { fill: C.ivory, font: { color: C.ink, size: 10 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: C.gold } };
strategy.getRange("E10:H10").merge();
strategy.getRange("E10").values = [["CAPTURE STANDARD"]];
strategy.getRange("E10:H10").format = { fill: C.maroon, font: { bold: true, color: C.white } };
strategy.getRange("E11:H16").merge();
strategy.getRange("E11").values = [[
  "Record vertical at 1080 × 1920 and 30 fps when possible.\n\n" +
  "Use clean fictional demo data. Hide real names, phones, emails, account details, addresses, URLs, and notifications.\n\n" +
  "One action per clip. Hold the starting and ending state for one second. No music, captions, cursor, address bar, or speed effects.\n\n" +
  "Name every file exactly as listed in 03 Website Recordings. Keep original source files; Flow receives copies."
]];
strategy.getRange("E11:H16").format = { fill: C.ivory, font: { color: C.ink, size: 10 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: C.gold } };
strategy.mergeCells("A18:H18");
strategy.getRange("A18").values = [["MASTER FLOW AGENT INSTRUCTIONS — COPY ONCE INTO PROJECT AGENT INSTRUCTIONS"]];
strategy.getRange("A18:H18").format = { fill: C.maroonDark, font: { bold: true, color: C.white, size: 12 } };
strategy.mergeCells("A19:H38");
strategy.getRange("A19").values = [[masterInstructions]];
strategy.getRange("A19:H38").format = { fill: C.paper, font: { color: C.ink, size: 9 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "medium", color: C.gold } };
strategy.mergeCells("A40:H40");
strategy.getRange("A40").values = [["CURRENT OFFICIAL FLOW / OMNI REFERENCES"]];
strategy.getRange("A40:H40").format = { fill: C.maroon, font: { bold: true, color: C.white } };
strategy.getRange("A41:H46").values = [
  ["Flow Agent", "Brainstorm, storyboard, create/edit media, organize assets, and work from dragged references.", "https://support.google.com/labs/answer/17093911?hl=en", "", "", "", "", ""],
  ["Omni model", "Text/image/video inputs, reference-to-video, video editing, vertical or horizontal output, 4/6/8/10 seconds depending on surface.", "https://support.google.com/flow/answer/16352836?hl=en", "", "", "", "", ""],
  ["Characters", "Create reusable characters from reference images; character can preserve face, clothing, voice, and information.", "https://support.google.com/flow/answer/16935308?hl=en", "", "", "", "", ""],
  ["Flow Avatar", "Authorized self-avatar from your own visual/audio likeness; use @me after setup. Availability varies by region.", "https://support.google.com/flow/answer/17102997?p=flowavatar&rd=1", "", "", "", "", ""],
  ["Editing / Scenebuilder", "Edit selected short segments conversationally; arrange, reorder, trim, preview, and download assembled clips.", "https://support.google.com/labs/answer/16935718?co=GENIE.Platform%3DDesktop&hl=en", "", "", "", "", ""],
  ["Omni prompting", "Use exact references and simple edit instructions; for refinements say what changes and keep everything else the same.", "https://ai.google.dev/gemini-api/docs/omni", "", "", "", "", ""],
];
for (let r = 41; r <= 46; r += 1) {
  strategy.mergeCells(`C${r}:H${r}`);
}
strategy.getRange("A41:H46").format = { fill: C.paper, font: { color: C.ink, size: 9 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: C.line } };
strategy.getRange("A41:A46").format = { fill: C.goldLight, font: { bold: true, color: C.maroonDark }, wrapText: true };
strategy.getRange("A41:H46").format.rowHeight = 42;
["A", "C", "E", "G"].forEach((col) => strategy.getRange(`${col}:${col}`).format.columnWidth = 18);
["B", "D", "F", "H"].forEach((col) => strategy.getRange(`${col}:${col}`).format.columnWidth = 31);
strategy.freezePanes.freezeRows(2);

// 01 Content Calendar
titleBlock(calendar, "S", "15-DAY CONTENT CALENDAR", "Edit the yellow launch date on 00 Strategy; publish dates populate automatically. Filter by funnel, owner, or status.");
const calendarHeaders = [["Post ID", "Day", "Format", "Funnel", "Objective", "Working Title", "Hook", "Presenter / Style", "Script / Slide Summary", "Product Proof", "Runtime / Slides", "On-screen Text", "CTA", "Caption Angle", "Required Inputs", "Status", "Owner", "Publish Date", "Notes"]];
calendar.getRange("A5:S5").values = calendarHeaders;
styleHeader(calendar, "A5:S5");
const calendarRows = posts.map((p) => [
  p.id, p.day, p.format, p.funnel, p.objective, p.title, p.hook, p.presenter, p.script,
  p.proof, p.duration, p.overlay, p.cta, p.caption, p.inputs, "Waiting for Assets", "Founder", null, p.notes,
]);
calendar.getRange("A6:S20").values = calendarRows;
calendar.getRange("R6").formulas = [["=IF('00 Strategy'!$B$6=\"\",\"\",'00 Strategy'!$B$6+B6-1)"]];
calendar.getRange("R6:R20").fillDown();
calendar.getRange("R6:R20").format.numberFormat = "yyyy-mm-dd";
styleBody(calendar, "A6:S20");
calendar.getRange("P6:P20").dataValidation = { rule: { type: "list", values: statusValues } };
calendar.getRange("Q6:Q20").dataValidation = { rule: { type: "list", values: ownerValues } };
calendar.getRange("P6:P20").conditionalFormats.add("containsText", { text: "Waiting for Assets", format: { fill: "#FFF0B8", font: { color: C.amber, bold: true } } });
calendar.getRange("P6:P20").conditionalFormats.add("containsText", { text: "Approved", format: { fill: "#DDF3E4", font: { color: C.green, bold: true } } });
calendar.getRange("P6:P20").conditionalFormats.add("containsText", { text: "Published", format: { fill: "#D9EAF7", font: { color: C.blue, bold: true } } });
calendar.getRange("A6:S20").format.rowHeight = 88;
addTable(calendar, "A5:S20", "ContentCalendar");
const calendarWidths = [10, 7, 11, 13, 27, 25, 30, 18, 40, 31, 22, 25, 24, 32, 25, 19, 20, 14, 26];
calendarWidths.forEach((w, i) => calendar.getRangeByIndexes(0, i, 20, 1).format.columnWidth = w);
calendar.freezePanes.freezeRows(5);
calendar.freezePanes.freezeColumns(2);

// 02 Omni Prompts
titleBlock(prompts, "L", "EXACT FLOW / OMNI AGENT PROMPTS", "Copy one prompt per post after selecting the listed inputs. Generate variations first; assemble only after approving the host or design direction.");
prompts.getRange("A5:L5").values = [[
  "Post ID", "Format", "Selected Inputs", "Exact Agent Mode Prompt", "Generation Settings",
  "Requested Output", "Scenebuilder / Slide Assembly", "Refinement Prompt", "Acceptance Criteria",
  "Reject If", "Status", "Output Link",
]];
styleHeader(prompts, "A5:L5");
const promptRows = posts.map((p) => [
  p.id,
  p.format,
  p.inputs,
  p.format === "Reel" ? reelPrompt(p) : carouselPrompt(p),
  p.format === "Reel"
    ? "9:16; presenter take 6 or 8 sec; final 14–18 sec; 1080×1920; synchronized voice; 3 variations; captions in safe zones"
    : "4:5; 7 slides; 1080×1350 PNG; 2 visual directions; exact typeset copy; consistent grid",
  p.format === "Reel"
    ? `3 host takes + 1 assembled final + source-preserving edit history`
    : "2 full design directions + 7 final ordered PNGs + review contact sheet",
  finalSequence(p),
  refinementPrompt(p),
  acceptance(p),
  rejection(p),
  "Waiting for Assets",
  "",
]);
prompts.getRange("A6:L20").values = promptRows;
styleBody(prompts, "A6:L20");
prompts.getRange("K6:K20").dataValidation = { rule: { type: "list", values: statusValues } };
prompts.getRange("K6:K20").conditionalFormats.add("containsText", { text: "Approved", format: { fill: "#DDF3E4", font: { color: C.green, bold: true } } });
prompts.getRange("A6:L20").format.rowHeight = 240;
addTable(prompts, "A5:L20", "OmniPrompts");
const promptWidths = [10, 11, 28, 92, 34, 30, 42, 45, 38, 38, 19, 30];
promptWidths.forEach((w, i) => prompts.getRangeByIndexes(0, i, 20, 1).format.columnWidth = w);
prompts.freezePanes.freezeRows(5);
prompts.freezePanes.freezeColumns(3);

// 03 Website Recordings
titleBlock(recordingsSheet, "M", "REAL WEBSITE RECORDING SHOT LIST", "These clips are the evidence half of the Reels. Record clean originals; Flow trims and sequences them but never recreates the interface.");
recordingsSheet.getRange("A5:M5").values = [[
  "Asset ID", "Clip Name", "Route / Screen", "Exact Action", "Orientation", "Duration",
  "Capture Rules", "Used In", "Filename", "Priority", "Owner", "Status", "Notes",
]];
styleHeader(recordingsSheet, "A5:M5");
recordingsSheet.getRange(`A6:M${5 + recordings.length}`).values = recordings;
styleBody(recordingsSheet, `A6:M${5 + recordings.length}`);
recordingsSheet.getRange(`J6:J${5 + recordings.length}`).dataValidation = { rule: { type: "list", values: priorityValues } };
recordingsSheet.getRange(`K6:K${5 + recordings.length}`).dataValidation = { rule: { type: "list", values: ownerValues } };
recordingsSheet.getRange(`L6:L${5 + recordings.length}`).dataValidation = { rule: { type: "list", values: statusValues } };
recordingsSheet.getRange(`L6:L${5 + recordings.length}`).conditionalFormats.add("containsText", { text: "Approved", format: { fill: "#DDF3E4", font: { color: C.green, bold: true } } });
recordingsSheet.getRange(`A6:M${5 + recordings.length}`).format.rowHeight = 78;
addTable(recordingsSheet, `A5:M${5 + recordings.length}`, "WebsiteRecordings");
const recordingWidths = [10, 29, 27, 48, 12, 13, 34, 28, 42, 13, 18, 19, 29];
recordingWidths.forEach((w, i) => recordingsSheet.getRangeByIndexes(0, i, 5 + recordings.length, 1).format.columnWidth = w);
recordingsSheet.freezePanes.freezeRows(5);
recordingsSheet.freezePanes.freezeColumns(2);

// 04 Character Bible
titleBlock(characterSheet, "M", "CHARACTER & VOICE BIBLE", "Build one recognizable host first. Add the founder avatar later for trust content, using only the founder’s authorized likeness and voice.");
characterSheet.getRange("A5:M5").values = [[
  "Character ID", "Flow Tag", "Role", "Visual Identity", "Wardrobe", "Voice",
  "Personality", "Camera / Setting", "Reference & Consistency Rules", "Do Not",
  "Requirement", "Owner", "Status",
]];
styleHeader(characterSheet, "A5:M5");
characterSheet.getRange("A6:M7").values = characterRows;
styleBody(characterSheet, "A6:M7");
characterSheet.getRange("K6:K7").dataValidation = { rule: { type: "list", values: ["Required", "Optional"] } };
characterSheet.getRange("L6:L7").dataValidation = { rule: { type: "list", values: ownerValues } };
characterSheet.getRange("M6:M7").dataValidation = { rule: { type: "list", values: statusValues } };
characterSheet.getRange("A6:M7").format.rowHeight = 130;
addTable(characterSheet, "A5:M7", "CharacterBible");
characterSheet.mergeCells("A10:M10");
characterSheet.getRange("A10").values = [["@NYOTAHOST SETUP — DO THIS ONCE BEFORE GENERATING P01"]];
characterSheet.getRange("A10:M10").format = { fill: C.maroon, font: { bold: true, color: C.white, size: 12 } };
characterSheet.getRange("A11:M16").values = [
  ["1", "Create / Characters", "Create a character named NyotaHost using AS-03 and AS-04. At least one image is required; two matching angles are preferred.", "", "", "", "", "", "", "", "", "", ""],
  ["2", "Character details", "Paste CHAR-01 visual identity, wardrobe, voice, personality, and consistency rules into Character Information.", "", "", "", "", "", "", "", "", "", ""],
  ["3", "Voice test", "Generate one 6-second test saying: “Welcome to Shaadi Nyota — your wedding invitation, beautifully reimagined.” Check pronunciation, pace, and warmth.", "", "", "", "", "", "", "", "", "", ""],
  ["4", "Identity test", "Generate front, 3/4, seated, and standing variations. Reject any face, hair, outfit, jewelry, skin-tone, or voice drift.", "", "", "", "", "", "", "", "", "", ""],
  ["5", "Lock project use", "Use @NyotaHost in every Reel prompt. Do not create a fresh presenter from text for each post.", "", "", "", "", "", "", "", "", "", ""],
  ["6", "Optional @me", "If desired later, create the founder Avatar through Flow’s official mobile QR process and reference it as @me. Availability can vary by account and region.", "", "", "", "", "", "", "", "", "", ""],
];
for (let r = 11; r <= 16; r += 1) {
  characterSheet.mergeCells(`C${r}:M${r}`);
}
characterSheet.getRange("A11:M16").format = { fill: C.paper, font: { color: C.ink, size: 10 }, wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: C.line } };
characterSheet.getRange("A11:A16").format = { fill: C.goldLight, font: { bold: true, color: C.maroonDark }, horizontalAlignment: "center" };
characterSheet.getRange("B11:B16").format = { fill: C.ivory, font: { bold: true, color: C.maroonDark }, wrapText: true };
characterSheet.getRange("A11:M16").format.rowHeight = 48;
const characterWidths = [11, 15, 26, 38, 33, 34, 28, 36, 39, 36, 14, 18, 19];
characterWidths.forEach((w, i) => characterSheet.getRangeByIndexes(0, i, 16, 1).format.columnWidth = w);
characterSheet.freezePanes.freezeRows(5);
characterSheet.freezePanes.freezeColumns(2);

// 05 Asset Checklist
titleBlock(assetsSheet, "L", "ASSET & DEPENDENCY CHECKLIST", "This is the founder handoff: provide the critical inputs first, then move a post from Waiting for Assets to Ready for Flow.");
assetsSheet.getRange("A5:L5").values = [[
  "Item ID", "Category", "Exact Item", "Why Needed", "Format / Spec", "Owner",
  "Priority", "Due", "Status", "File / Link", "Used In", "Notes",
]];
styleHeader(assetsSheet, "A5:L5");
assetsSheet.getRange(`A6:L${5 + assets.length}`).values = assets;
styleBody(assetsSheet, `A6:L${5 + assets.length}`);
assetsSheet.getRange(`F6:F${5 + assets.length}`).dataValidation = { rule: { type: "list", values: ownerValues } };
assetsSheet.getRange(`G6:G${5 + assets.length}`).dataValidation = { rule: { type: "list", values: priorityValues } };
assetsSheet.getRange(`I6:I${5 + assets.length}`).dataValidation = { rule: { type: "list", values: statusValues.concat(["Available", "Ready"]) } };
assetsSheet.getRange(`I6:I${5 + assets.length}`).conditionalFormats.add("containsText", { text: "Ready", format: { fill: "#DDF3E4", font: { color: C.green, bold: true } } });
assetsSheet.getRange(`I6:I${5 + assets.length}`).conditionalFormats.add("containsText", { text: "Available", format: { fill: "#D9EAF7", font: { color: C.blue, bold: true } } });
assetsSheet.getRange(`A6:L${5 + assets.length}`).format.rowHeight = 66;
addTable(assetsSheet, `A5:L${5 + assets.length}`, "AssetChecklist");
const assetWidths = [10, 15, 34, 34, 31, 21, 13, 14, 19, 36, 28, 34];
assetWidths.forEach((w, i) => assetsSheet.getRangeByIndexes(0, i, 5 + assets.length, 1).format.columnWidth = w);
assetsSheet.freezePanes.freezeRows(5);
assetsSheet.freezePanes.freezeColumns(2);

const inspection = await wb.inspect({
  kind: "workbook,sheet,table,formula",
  include: "id,name,range,formula",
});
await fs.writeFile(path.join(outputDir, "inspection.json"), inspection.ndjson ?? JSON.stringify(inspection, null, 2), "utf8");

const previewSheets = [
  ["00 Strategy", "00-strategy.png", 0.7],
  ["01 Content Calendar", "01-content-calendar.png", 0.48],
  ["02 Omni Prompts", "02-omni-prompts.png", 0.34],
  ["03 Website Recordings", "03-website-recordings.png", 0.43],
  ["04 Character Bible", "04-character-bible.png", 0.48],
  ["05 Asset Checklist", "05-asset-checklist.png", 0.48],
];
for (const [sheetName, fileName, scale] of previewSheets) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale, format: "png" });
  await fs.writeFile(path.join(outputDir, fileName), new Uint8Array(await preview.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(path.join(outputDir, "Shaadi-Nyota-15-Day-Content-Production.xlsx"));
console.log(JSON.stringify({
  workbook: path.join(outputDir, "Shaadi-Nyota-15-Day-Content-Production.xlsx"),
  sheets: previewSheets.map(([sheetName, fileName]) => ({ sheetName, preview: path.join(outputDir, fileName) })),
}));
