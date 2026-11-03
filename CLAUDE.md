# REACH business materials

Published copy of the REACH business materials. Read `README.md` for how this
repo relates to the OneDrive source folder.

Everything written in this repo, from pages and documents to screen copy and
emails, follows @LANGUAGE_AND_TONE.md: plain English that isn't dumbed down,
every journey step and flow chart box said in the reader's words, and the
standing tone, naming and brand rules. Read it before writing, and run its
read-aloud check before anything ships.

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
