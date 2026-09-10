# REACH Business Materials

Draft business materials for REACH, the white-labeled engagement and
orchestration platform run by the public-serving division of Refresh.

The main study is the live page. It is published twice, once as `index.html`
so the repository root serves it, and once under its own name. The root URL
stays put even when the study is renamed.

| Page | What it is |
| --- | --- |
| `index.html` | The main study. This is what the published URL serves. |
| `REACH_Business_Case_and_Strategic_Launch_Path.html` | The same study under its own name. |
| `REACH_Business_Case_and_Strategic_Launch_Path.pdf` | Print version, linked from the study. |
| `decentralized-services.html` | Companion study: turning one agency's expertise into a service other markets can buy. |
| `REACH_Decentralized_Mission_Services.pdf` | Print version of the companion. |
| `REACH_Strategic_Business_Plan_Deck.html` | The same case as slides, for a live session. Published but not linked. |
| `materials.html` | A three-card index of everything, for when it all goes live. |

The companion's filename is deliberately name-neutral, because what the
service is called is still an open decision. Nothing has to move when the
name is chosen.

These are drafts for review. Named organizations in them illustrate partner
and provider types; they are not partners or integrations.

## Editing

The pages are written and edited in OneDrive, at
`Documents\Refresh\Refresh Claude Cowork`. That folder is the source of
truth. This repository is the published copy, so edits made here directly
will be overwritten on the next publish.

To publish a change, edit the page in OneDrive and run `publish.ps1` from
that folder. It copies the pages and the PDFs across, adds a `noindex` tag so
the drafts stay out of search results, commits, and pushes.

Both studies carry the Refresh brand: the wordmark and the painted strokes are
lifted from the master slide deck and embedded in each page, so the files are
self-contained and the PDFs keep their colour. The companion is generated from
the main study's stylesheet, so the two cannot drift apart.

After any text edit, regenerate the PDF for that page with headless Chrome:

    chrome --headless=new --no-pdf-header-footer --print-to-pdf=<out.pdf> <page.html>
