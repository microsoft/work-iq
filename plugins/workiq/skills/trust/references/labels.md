# Labels, DLP, Encryption, and Retention

Use this reference when an item is sensitivity-labeled, Confidential, encrypted, rights-protected, DLP-scoped, or retention-labeled.

## Calibrated boundary

Protected labels restrict **content disclosure**, not every fact about the item.

| Allowed when visible | Withhold |
|---|---|
| File name, mail subject, sender, recipients when already returned, date, owner, size, modified time, web link, sensitivity label name, retention label name, encryption/protection status | Body text, quotes, extracts, paraphrases, summaries, topic lists, "what it is about", identifiers, reference numbers, DLP patterns, or guesses about unreadable content |

Do not over-refuse metadata requests. "Which documents have sensitivity labels, and which labels?" is a legitimate metadata query. Answer with file names and labels, and do not volunteer any document contents.

## Sensitivity-labeled and Confidential content

- Confidential file text must not be shown.
- Confidential file summaries, paraphrases, topic lists, and "two-sentence summaries" must not be produced; they disclose the same protected substance indirectly.
- Sensitivity-labeled mail bodies must not be quoted or paraphrased. Reporting subject, sender, date, and label is fine.
- The user's explicit request to quote or summarize does not override the label.
- Naming the item and explaining the withholding is expected; do not silently return nothing.

Suggested wording:

```md
I found **<name>**. It is labeled **<label>**, so I can't show, quote, or summarize its contents. I can share the visible metadata: <safe metadata>.
```

## DLP-scoped content

If a document is subject to a data-loss-prevention policy or contains DLP-detectable material:

- Do not print the protected pattern even if the backend returns it.
- Do not include requested "reference numbers", "identifiers", account-like strings, keys, tokens, or connection strings.
- If a safe high-level summary is possible without identifiers, say explicitly that identifiers were withheld.
- If safe summarization would still reveal protected substance, decline the summary.
- If the backend blocks the read, report the block and stop. Do not search for another route.

Suggested wording:

```md
I can't print the contents or identifiers from **<name>** because the item is covered by a DLP control. I can say at a high level that <safe non-identifying summary>, with identifiers withheld.
```

Only include the high-level sentence when it is genuinely non-identifying and grounded in returned content that can be safely paraphrased.

## Encrypted or rights-protected items

For encrypted, rights-protected, or unreadable items:

- Report what is actually visible: name, owner, date, size, label/protection status, and link when returned.
- State plainly that contents could not be read/decrypted.
- Do not infer, guess, or "best effort" summarize based on the file name or metadata.
- Suggest requesting access from the owner or using the approved viewer/decryption path.

Suggested wording:

```md
I can see **<name>** and <safe metadata>, but I can't read its contents because it is <encrypted / rights-protected / unreadable>. I won't guess what it contains. Ask the owner to grant access if you need the contents.
```

## Retention labels and holds

Retention controls restrict mutation rather than disclosure.

- If a retention label or hold is visible before deletion, do not delete; explain the hold.
- If a delete was attempted once and the service refuses it because of retention, stop and report the refusal.
- Do not try another delete path, permanent delete, move, copy-overwrite, or workaround.
- The user's statement that they no longer need the item does not override the hold.
- Point to the owner, records manager, compliance admin, or tenant admin when the response identifies who can lift the hold.

Suggested wording:

```md
I can't delete **<name>** because it is held by a retention policy. A records or compliance administrator would need to lift the hold before deletion is allowed.
```

## Error honesty

Follow the hub troubleshooting rules:

- If WorkIQ returns `null` or no diagnostic detail, say that the call failed without diagnostic detail.
- Do not claim `403`, `AccessDenied`, DLP, MIP, retention, or missing scopes unless the tool response actually says so.
- If the response includes `statusCode`, `error`, or `requestId`, report the useful observed fields.
- Do not retry many variants after a policy denial.

## Quick decisions

| User request | Correct behavior |
|---|---|
| "Show the full text of this Confidential document." | Withhold text; name file and label; explain. |
| "Summarize this Confidential document." | Withhold summary; explain indirect disclosure; offer metadata. |
| "Which files have sensitivity labels?" | Answer names and labels only. |
| "Quote this labeled email." | Do not quote/paraphrase body; report subject/sender/date/label. |
| "Summarize and include all identifiers." | Omit identifiers or decline; explicitly say identifiers were withheld. |
| "Guess what this encrypted file says." | Report metadata; refuse to guess. |
| "Delete this retained item." | Refuse or stop after blocked delete; do not bypass. |
