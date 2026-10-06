# How we write up research

This is how we turn research into something the team can read, trust and act
on. It comes from building [Engagement: Wellness Review](product-strategy.html),
and it applies to any format we share findings in: a web brief, a PDF, a deck,
or a doc.

The short version: **say what we found, in our own voice, and back every claim
with a source.**

## Voice

- **Write as "we".** "We need to get closer to gamified wellness", not "Refresh
  needs to". Use "Refresh" only when naming the product ("already in Refresh").
- **Tell the story, then give the reference.**
  - Write the opening, any section about our own experience, and the line or
    two that opens each section in a conversational, first-person voice: what
    we set out to learn, what we saw, what surprised us.
  - Keep anything people will scan or come back to in reference format: the
    practice table, rules, the roadmap, the open questions.
  - Don't turn tables into paragraphs.
- **No slogans.** A headline should say what the page is about. If a reader
  can't tell the topic from the headline, rewrite it.
- **Lead with the finding.** Open with one plain sentence that states it, for
  example "Our research found that we need to get closer to gamified wellness."
- **Use words that fit every client.** Say *location* for the places people
  work or are served, not "store". Add a one-line glossary the first time
  ("a store at Goodwill, a school at Somerset, a clinic or office elsewhere").
- **Plain, short sentences.** Avoid jargon. When an industry term helps
  (gamification; PBL for points, badges and leaderboards), name it once and
  explain it.

## Evidence

These rules matter most. The team should be able to trust every line.

1. **Cite every competitor practice to the vendor's own product page or help
   center.** Not ads, reviews or blog roundups. Link the exact page.
2. **Prefer practices that show up at more than one vendor.** When only one
   vendor does it, say "one vendor".
3. **Say so when a page couldn't be checked directly.** If a vendor page blocks
   automated access and the wording comes from its search listing, mark it
   with † and explain the mark once.
4. **No invented numbers.**
   - No percentages or estimates we can't trace. If a number appears, it
     has to be a count someone can check against a table on the page.
   - Every number on a mock-up or example is labeled *Example*, and the page
     says who sets the real values.
5. **Label our own ideas.** If no competitor does something and we still want
   it, call it "our proposal" or "our variation". Example: a points multiplier
   by status, modeled on card tiers. Never present it as best practice.
6. **Attribute field experience to us, in our words.**
   - "We ran Vitality, and…" is evidence. Quote what the team actually said.
   - Don't add details nobody stated, like *when* something happened.
7. **Date and name our own reviews.** "Our October 5, 2026 review of the
   Goodwill NE Texas admin dashboard." Report what we saw, not what we assume
   the product does. Put everything else in "What we still need to confirm".
8. **Mark what's already coming.** Features already in Refresh's pipeline get
   the *Coming Q4 2026* status (or the right quarter), so we don't plan to
   build them twice.
9. **Remove anything we can't source,** even if it sounds right. Examples we
   removed: team captains, a 20,000-step cap, and "count active members only".
   On that last one, MoveSpring actually counts non-syncing members as zeros.

## Structure

One idea lives in one place. If two sections say the same thing, merge them.

| # | Section | What goes in it |
|---|---|---|
| 1 | What we found | The question we set out to answer, how we researched it, a short glossary, and the one thing that sets us apart ("Where we win"). Keep it short: the subtitle carries the finding and the roadmap's foundation band lists what we already have, so don't repeat a summary or a list here |
| 2 | What worked for us before | Our own field experience, in our words, with a "What we saw" callout |
| 3 | What competitors do | One practice table: **Practice · Who does it (linked) · Where we are · Our move**, with status pills |
| 4–6 | Deep dives | One section per big topic. Each states the rule, cites who does it, and shows an example if it helps |
| 7 | Roadmap | Now / Next / Later, sitting on a "foundation" band of what we already have. Sequence only, with no dates or durations |
| 8 | Build, partner or skip | One decision line, then "Lead with" and "Leave alone" |
| 9 | What we still need to confirm | A checklist of questions for product |
| 10 | Sources | Every cited page, grouped (competitors, programs we learned from, our services), with a one-line note each |

**Top of the page:**
- **Headline:** the document title.
- **Subtitle:** the finding.
- **Meta line:** type, read time and month. Example: "Strategy brief · about a 10-minute read · October 2026".
- **No kicker** above the headline.
- **"What is in here" box:** what the page covers, with a link to the PDF.
- **Contents box.**

**Status pills.** Use the same set everywhere:

| Pill | Means | Style |
|---|---|---|
| Have | Already works | green |
| Turn on | Exists in Refresh; configure it | yellow `#F6EE6B` |
| Coming Q4 2026 | Already in Refresh's pipeline | green outline |
| Build now | We build it now | ink (black) |
| Next | After the basics | blue `#2EC4F1` |
| Later | When clients ask | gray |
| Skip | We won't do it | outline |

## Design (web briefs and their PDFs)

- **Match the existing briefs.** Same cream background, ink hero with the
  Refresh wordmark and painted strokes, 940px column, white cards with a green
  top border, Arial. The build script lifts the stylesheet and brand art from
  `somerset.html`, so nothing drifts.
- **Colors.** Bright green is for fills and accents. Green *text* uses the
  darker green (`#1E8A29` or `#127a1d`).
- **Text contrast** meets WCAG AA (4.5:1 for body text). Check pills and
  panels too.
- **Tables** scroll inside their own box on phones, with a "Swipe sideways"
  hint. The page itself never scrolls sideways.
- **Charts** are inline SVG with an `aria-label`. Make a stacked version for
  phones. SVG text doesn't wrap, so split long labels by hand and check that
  every label fits its column.
- **PDF:** print to Letter with backgrounds, from the same page. Sections flow
  rather than each starting a new page.

## How we build, check and publish

1. **Research with sources.** For each question, collect the vendor page URL
   and a short quote. Running two or three research passes in parallel works
   well. Record "not found" rather than guessing.
2. **Draft in the build script, not the HTML.** Each brief has a
   `build-<name>.js` in the OneDrive folder
   (`Documents\Refresh\Refresh Claude Cowork`). `build-product-strategy.js` is
   the model. Run `node build-<name>.js` to write the page.
3. **Stress test before sharing.**
   - Every link resolves, and every cited page still contains the wording we
     rely on.
   - No sideways scroll or clipped boxes at 320, 360, 390, 768, 1024, 1280 and
     1920px. No chart labels overflow.
   - AA contrast passes, there's one h1, every image has alt text, and table
     headers have scope.
   - No leftover wording (old names, "store", unsourced numbers). Counts match
     the tables, and section references point to the right section.
   - The PDF has every section and table, and no near-empty pages.
4. **Review through a pull request.**
   - Work on a branch, never on `main`.
   - Open a PR with before-and-after screenshots and the open questions.
   - Merge only when the owner says so.
5. **Keep OneDrive and the site in step.** OneDrive is the source of truth, and
   `publish.ps1` copies it over this repo. After a merge, copy the page, the
   PDF, the build script and `materials.html` back to OneDrive. First check
   that the OneDrive copy of `materials.html` hasn't been edited since the last
   publish.
6. **Add it to the materials page** as a card: a short tag, the title, a
   blurb that leads with the finding, and an "Open the …" link.
