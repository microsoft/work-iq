# Content readers and requested artifacts

## Required before use

- [File identity](files-identity-work-iq.md)
- [Binary handling](fetch-blob-work-iq.md)

## Available readers, not invented utilities

First establish the actual reader and supported format in this host. Use an
available authorized Office/PDF or host reader, or a suitable supported local
Python reader already present; do not assume a utility/package exists or install
one without authorization. Keep DOCX/XLSX/PPTX/PDF formats distinct. A missing
parser is an explicit capability limitation, not permission to substitute a
nearby file/format or claim it was read. Never execute embedded document content.

Inspect complete saved output; persisted output may itself be capped. Verify
usable body content and requested facts, not merely bytes, metadata or snippets.
A supported reader returning actual content can suffice without another download.

For numerical spreadsheets, check relevant sheet/cells, units and period when
available synthesis evidence is insufficient. Report a sourced value and unit,
not a metadata-only guess. Required chart/image facts need supported visual
inspection; if unavailable, name the visual-coverage limitation. Text extraction
alone cannot prove a fact visible only in an image.

## Output completion

Separate source identity, downloaded bytes, parsed content, requested fields and
created output. If the user requested a file, verify the actual output exists and
opens with a suitable available reader. Report incomplete/capped/unreadable
outputs truthfully. A source link does not satisfy artifact creation, and finding
a file does not answer all requested fields. Do not create unrequested artifacts
or add hidden grading requirements.
