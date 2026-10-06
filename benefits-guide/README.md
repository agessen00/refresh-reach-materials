# Beyond Insurance: Yours to Keep

A reusable, print-ready set of benefits-guide pages for any organization that
receives the Refresh / REACH grant. The pages present the Refresh app and its
free services as real benefits of joining the team, many of which stay with
people after they leave.

Every organization-specific detail comes from one config file.

## Build

```
npm install
node build.js config/sample-goodwill-ne-texas.json
```

The build writes to `out/<slug>/`:

| Output | What it is |
|---|---|
| `pages/*.html` | One file per page |
| `index.html` | All pages in order, for review, with a preview/print toggle |
| `<slug>-beyond-insurance.pdf` | The combined guide, US Letter, printed in print mode |
| `pdf-pages/*.pdf` | One PDF per page, for using a page on its own |
| `previews/*.png` | 150 dpi previews of each page, in preview mode |

Each build checks every page in both modes. It reports any page that runs past
one Letter sheet, and any body text smaller than 10.5pt. If anything is
reported, the build exits with code 2.

PDFs use Chrome through Playwright (`channel: 'chrome'`), so Google Chrome must
be installed.

If a page would run long, its spacing tightens automatically; text sizes don't
change. If it still doesn't fit, the build names the page. The usual cause is
a very long peer quote, `org_short`, or "Yours to keep" text, so shorten those
first.

Green text uses `#127a1d` rather than the brand's `#1E8A29`, which falls just
short of WCAG AA contrast on white and cream. Bright green stays for fills.

## Preview mode and print mode

- **Preview mode** (open any page normally) highlights in yellow every value
  that is still `[BRACKETED]` or contains `CONFIRM`. Photo and phone-mockup
  slots show a label saying what goes there.
- **Print mode** (add `?print` to the URL) hides all of those: placeholder
  text, unfilled photo slots, the QR placeholder, and peer quotes that are
  still entirely placeholders.
- **The PDFs are printed in print mode,** so fill in or remove every highlight
  before a guide goes out. Otherwise it prints with gaps.

## Filling in a config

1. Copy `config/blank.json` to `config/<grantee>.json`.
2. Replace every `[BRACKETED]` value. To use a value that still needs checking,
   keep the text and add `CONFIRM` to it, as in the sample.
3. Set nullable values to `null` to leave them out. Examples: no EAP, no peer
   quote, no member ID.
4. Run `node build.js config/<grantee>.json` and look at every preview.

### Config keys

| Key | Type | Used for |
|---|---|---|
| `slug` | string | Output folder and PDF file name |
| `org_name` | string | Full name: opener intro and page footers |
| `org_short` | string | Short name in headlines and copy, and the co-brand lockup |
| `mission_line` | string | Last sentence of the opener intro |
| `health_plan` | string | Meet Refresh tiles; wellness-visit tie-in on Earn & Celebrate |
| `telehealth` | string | Meet Refresh tiles; telehealth callout strip |
| `eap_name` | string or null | Opens Mind, Crisis & Family; EAP callout strip. `null` leaves both out |
| `state` | string | SNAP card on Find Help Near You |
| `state_snap_site` | string | SNAP site name, shown as the link text |
| `state_snap_url` | string or null | Link target for the SNAP site |
| `eligibility_line` | string | "From day one" promise on the opener |
| `day_one` | bool | `false` hides every "From day one" badge |
| `yours_to_keep_app_text` | string or null | "Yours to keep" band on Meet Refresh. `null` hides the band and that page's badge |
| `rx_member_id` | string or null | ID on the prescription card. `null` prints "See your card in the app" |
| `reward_examples` | string | Gift card examples on Earn & Celebrate |
| `points_examples.{steps, wellness_visit, reflection, money, shoutout}` | strings | Sample challenges table |
| `menu_paths.{refresh_home, local_services, rx_card, money_legal, health_wellness, work_life, employee_resources}` | strings | "Find it in Refresh" bars and "How to start" steps. Use the grantee's exact menu names |
| `quotes.{page1, page2, page3, page7}` | `{text, first_name, role, location}` or null | Peer quote slots. `null` hides the slot |
| `optional_pages.everyday_savings` | bool | Member-discount panel on Earn & Celebrate |
| `optional_pages.move_eat_rest` | bool | Move, Eat & Rest page |
| `optional_pages.share_with_family` | bool | Share With Your Family & Community page |
| `optional_pages.back_cover` | bool | Back cover with QR and monthly themes |
| `badges.{free, day_one, yours_to_keep, always_on, bilingual}` | bools | `false` turns that badge off on every page |
| `page_number_start` | number or `"[XX]"` | Page number for Meet Refresh. The opener takes the number before it if there is one. Later pages and every "See page" reference count up from here |
| `growth_programs` | string | "At [org_short]" box on Grow Your Skills |
| `privacy_line` | string | Privacy line in the footer of Meet Refresh |
| `monthly_themes` | 12 strings | Month strip on the back cover |
| `support_contact` | string | Contacts strip and back cover |
| `qr_url` | string | When set to a real link, every QR is generated from it |
| `logo_paths.wordmark` | path or null | Grantee wordmark in page footers. Otherwise `org_name` is shown |
| `logo_paths.lockup` | path or null | Grantee logo in the "R × [ORG]" lockup. Otherwise `org_short` is shown |
| `photos.{p2, p3, p4, p5, p6, p7, move, family, phone_mockup}` | paths, optional | Real photos for the photo slots and the phone mockup. Prefer real team members, with permission |
| `confirmed.money_yours_to_keep` | bool, optional | Set to `true` once money coaching is confirmed as "Yours to keep". Until then that badge shows as CONFIRM |

## Facts file

`facts.json` lists every statistic, phone number, card detail and source in the
template copy. Each one was checked against the publisher's own page on
2026-10-06. Anything marked `"ok": false` prints as a CONFIRM placeholder.

Found during the check:

- **NeedyMeds card:** BIN `020750`, GRP `REFRESH` and help desk `1-800-401-1031`
  could not be confirmed. NeedyMeds' generic card uses BIN 019520, GRP DRUGCARD
  and 1-888-602-2978. 020750 appears on co-branded cards, so check these against
  the Refresh card in the app. PCN `NMeds`, "Save up to 80%", "65,000+
  pharmacies", "never expires" and "can't be combined with insurance" are
  confirmed.
- **Deductibles:** the line that discount purchases don't count toward a
  deductible is not on NeedyMeds' card, so it prints as CONFIRM.
- **MetLife 2026:** the wording follows MetLife exactly. "50% of employees often
  avoid seeking medical care because of out-of-pocket costs", and "83% … say
  rising living expenses and medical costs are their top stressors."
- **Learning:** GCFLearnFree is now LearnFree. Coursera's free option is now a
  first-module preview, and edX is still free to audit. Mango is free only
  through libraries that offer it.
- **Enrich:** this is iGrad's platform, not part of KOFE. It prints as CONFIRM
  unless it's in the grantee's app.

Re-check `facts.json` the week a guide goes to print.

## Customize for each grantee

- [ ] Walk through the grantee's app and use their exact menu names.
- [ ] Confirm eligibility (all staff, part-time, day one, family, community).
- [ ] Confirm what's "Yours to keep" under their agreement.
- [ ] Confirm reward examples and point values.
- [ ] Decide whether to print the Rx member ID.
- [ ] Get written permission for every quote and photo.
- [ ] Confirm the privacy wording.
- [ ] Re-check all phone numbers and links the week the guide goes to print.
- [ ] Generate the grantee's QR code.
