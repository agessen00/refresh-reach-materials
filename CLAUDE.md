# REACH business materials

Published copy of the REACH business materials. Read `README.md` for how this
repo relates to the OneDrive source folder.

When writing up research or creating a new brief, follow
@RESEARCH_BRIEF_GUIDE.md: the voice, the sourcing rules, the page structure
and the build, check and publish steps.

Workflow rules:
- Never commit on `main`. Create a branch, and check `git branch --show-current`
  before every commit. Open a PR and merge only when the owner asks.
- `publish.ps1` (in OneDrive) overwrites the pages here and pushes `main`.
  After any merge, update the OneDrive copies so a publish can't undo it.
- Edit a brief's `build-*.js` script, not its generated HTML, then regenerate
  the PDF.
