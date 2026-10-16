# SharePoint library metadata

## SharePoint library columns

For explicitly requested library columns or filtering/counting/grouping/sorting
by them, use structured list-item fields, not retrieved document text. A document
author/owner mention is not the library's Owner column.

1. Resolve the exact site and library from supplied/returned identity using
   supported paths, e.g. `/sites/{host}:/sites/{siteName}` then
   `/sites/{siteId}/lists?$select=id,name,displayName`.
2. Read `/sites/{siteId}/lists/{listId}/columns?$select=name,displayName,indexed,hidden`.
   Map display labels to actual internal names; do not guess a field or silently
   substitute a similarly named column. A missing column differs from an empty
   field and from a failed read.
3. Read `/sites/{siteId}/lists/{listId}/items?$expand=fields&$top=100`.
   Custom columns live under `fields`, not a bare list-item `$select`. Only
   report values actually returned under confirmed internal field names.
4. Continue supported `@odata.nextLink` for required completeness. The documented
   page cap is 100: a full capped page without usable continuation is not proof
   of all items. Respect user/runtime budgets and report partial/lower-bound
   counts if coverage is incomplete; do not infer empty/all/earliest/latest.
5. If a diagnostic specifically rejects a non-indexed filter, read supported
   field pages and process locally within scope. A generic 400 is not that
   diagnostic. Explicit denial stops; no alternate addressing or recursive
   sweep to bypass it.

Verify requested item identity and comparison population before aggregating.
Distinguish a deliberately excluded population, absent column, not-retrieved
field and empty value. Content summaries may still use sufficient retrieved
evidence, but metadata claims require these structured values.
