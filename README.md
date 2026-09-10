# REACH Business Materials

Draft business materials for REACH, the white-labeled engagement and
orchestration platform run by the public-serving division of Refresh.

The study is the live page. It is published twice, once as `index.html` so the
repository root serves it, and once under its own name.

| Page | What it is |
| --- | --- |
| `index.html` | The study. This is what the published URL serves. |
| `REACH_Business_Case_and_Strategic_Opportunity.html` | The same study under its own name. |
| `REACH_Business_Case_and_Strategic_Opportunity.pdf` | Print version, linked from the study. |
| `REACH_Strategic_Business_Plan_Deck.html` | The same case as slides, for a live session. Published but not linked. |
| `materials.html` | A two-card index of the study and the deck, for when both go live. |

These are drafts for review. Named organizations in them illustrate partner
and provider types; they are not partners or integrations.

## Editing

The pages are written and edited in OneDrive, at
`Documents\Refresh\Refresh Claude Cowork`. That folder is the source of
truth. This repository is the published copy, so edits made here directly
will be overwritten on the next publish.

To publish a change, edit the page in OneDrive and run `publish.ps1` from
that folder. It copies the pages and the PDF across, adds a `noindex` tag so
the drafts stay out of search results, commits, and pushes.

The study carries the Refresh brand: the wordmark and the painted strokes are
lifted from the master slide deck and embedded in the page, so the file is
self-contained and the PDF keeps its colour.
