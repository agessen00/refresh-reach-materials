# REACH Business Materials

Draft business materials for REACH, the white-labeled engagement and
orchestration platform run by the public-serving division of Refresh.

| Page | What it is |
| --- | --- |
| `index.html` | Landing page. Two cards, one per document. |
| `REACH_Business_Case_and_Onboarding_Study.html` | The self-paced study: what we are building, the frameworks, the model, the metrics, the risk, the architecture, and the strategic bet. |
| `REACH_Strategic_Business_Plan_Deck.html` | The same case as slides, for a live session. Arrow keys or space bar to advance. |

These are drafts for review. Named organizations in them illustrate partner
and provider types; they are not partners or integrations.

## Editing

The three pages are written and edited in OneDrive, at
`Documents\Refresh\Refresh Claude Cowork`. That folder is the source of
truth. This repository is the published copy, so edits made here directly
will be overwritten on the next publish.

To publish a change, edit the page in OneDrive and run `publish.ps1` from
that folder. It copies the pages across, adds a `noindex` tag so the drafts
stay out of search results, commits, and pushes.
