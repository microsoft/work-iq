# Work IQ Files CLI

Use the CLI for WorkIQ file objects at `/api/beta/files/{id}` or `/api/files/{id}`. When `_meta["com.microsoft.workiq/clientAction"]` has `kind: "file-transfer"`, use its `fileId` as `--file-id` and follow its `direction` and `expiresAt`.

The transfer contract is `GET contentUrl` for download, `PUT contentUrl` for upload, and `GET statusUrl` for progress. These URLs require WorkIQ authentication; they are not anonymous presigned links. Use the CLI below to handle authentication and transfer.

When response conversion is disabled, the provider's original response is preserved. Existing drive `/content` and mail `/attachments/{id}/$value` downloads stay on [fetch_blob](fetch-blob-work-iq.md), without CLI setup or EULA acceptance. Route by object, not the `/content` suffix. Use entity tools for structured metadata queries; do not convert Graph IDs into WorkIQ file IDs.

## Install

Requires Node.js 20+. Install only when needed:

```powershell
npm install --global @microsoft/workiq-files@0.1.1 --registry=https://packagefeedproxy.microsoft.io/npm/
workiq-files --help
```

## Review and accept the EULA

Show the terms:

```powershell
$eula = workiq-files eula show | ConvertFrom-Json
$eula.terms
```

Obtain **explicit user permission** before running the following separate command. It accepts immediately without a confirmation prompt. Installation or a transfer request is not consent; never automate acceptance, including after an error.

```powershell
workiq-files accept-eula
```

Authentication, status, and transfers require an accepted EULA. Do not repeat acceptance when the current terms are already accepted.

## Sign in and transfer

```powershell
workiq-files auth login
```

Use the intended account. Confirm the exact remote target and local path before uploading or overwriting files. Replace the placeholder with the returned WorkIQ file ID:

```powershell
workiq-files status --file-id "<workiq-file-id>"
workiq-files download --file-id "<workiq-file-id>" --out ".\downloads\report.pdf"
workiq-files upload --file-id "<workiq-file-id>" --in ".\report.pdf"
```

Alternatively, replace `--file-id ID` with `--reference ".\workiq-reference.json"` for a protected file containing the canonical WorkIQ reference. Paths are relative to CWD; see `workiq-files --help` for other options.

## Safety

Never expose tokens, signed URLs, reference secrets, or account-cache contents. Stop on authentication, consent, access, or policy denial; do not switch tools, accounts, or endpoints to bypass it. Verify the downloaded file exists and report uploads complete only from confirmed results; session creation is not a completed transfer. Do not blindly replay an ambiguous upload or execute downloaded content.
