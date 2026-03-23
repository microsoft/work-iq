---
name: site-explorer
description: Browse and discover SharePoint sites, lists, document libraries, and file contents — navigate your SharePoint world without leaving the CLI.
---

# Site Explorer

Navigate your SharePoint environment interactively. Search for sites, browse their lists and document libraries, inspect list schemas and items, preview files, and drill into folder structures — all from the command line.

## When to Use

- "What SharePoint sites do I have access to?"
- "Show me the lists on the Marketing site"
- "What's in the Shared Documents library on the HR site?"
- "Browse the Project Alpha site"
- "What columns does the Vendor Tracker list have?"
- Discovering content across SharePoint before working with it

## Instructions

### Step 1: Identify the User

```
workiq-ask_work_iq (
  question: "What is my profile information including display name and email address?"
)
```

### Step 2: Find Sites

**Search by name:**
```
workiq-ask_work_iq (
  question: "Search for SharePoint sites matching '<site name or partial name>'. For each site return the site name and URL."
)
```

**Browse top sites (no specific name):**
```
workiq-ask_work_iq (
  question: "What SharePoint sites do I have access to? List each site's name and URL."
)
```

Present discovered sites:

```
🌐 SHAREPOINT SITES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 #   Site Name                  URL
 1   HR Hiring Portal           contoso.sharepoint.com/sites/HRHiring
 2   Marketing Hub              contoso.sharepoint.com/sites/Marketing
 3   Project Alpha              contoso.sharepoint.com/sites/ProjectAlpha
 4   Engineering Wiki           contoso.sharepoint.com/sites/EngWiki

Which site would you like to explore?
```

### Step 3: Explore a Site — Lists and Libraries

Retrieve all lists and document libraries on the selected site:

```
workiq-ask_work_iq (
  question: "What lists and document libraries are on the '<site name>' SharePoint site? For each list include the name, item count, and last modified date. For each document library include the name and file count."
)
```

Display:

```
📁 SITE: {Site Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 LISTS ({count})
 #   List Name                  Items   Last Modified
 1   Job Openings               24      Feb 25, 2026
 2   Candidate Feedback         156     Feb 27, 2026
 3   Interview Schedule         42      Feb 28, 2026

📚 DOCUMENT LIBRARIES ({count})
 #   Library Name               Files
 4   Shared Documents           87
 5   Templates                  12
 6   Meeting Notes              34

🛠️ ACTIONS
  "show list #1"          — view list items
  "show columns in #2"    — inspect list schema
  "browse #4"             — explore document library
  "show subsites"         — list child sites
```

### Step 4: Explore a List — Schema

View column definitions for a list:

```
workiq-ask_work_iq (
  question: "What are the columns in the '<list name>' list on the '<site name>' SharePoint site? For each column include the name, data type, whether it is required, and description."
)
```

Display:

```
📋 LIST SCHEMA: {List Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Column Name          Type          Required   Description
 Title                Text          ✅         Job title
 Department           Choice        ❌         HR, Eng, Marketing, Sales
 Status               Choice        ✅         Open, Closed, On Hold
 Hiring Manager       Person        ❌         —
 Target Start Date    DateTime      ❌         —
 Salary Range         Text          ❌         —

🛠️ ACTIONS
  "show items"           — view list data
  "show items where Status = Open" — filtered view
```

### Step 5: Explore a List — Items

Retrieve list items:

```
workiq-ask_work_iq (
  question: "Show me the items in the '<list name>' list on the '<site name>' SharePoint site. Include all columns for each item."
)
```

Display items in a table format, using column names as headers. Show the first 20 items; note if more exist.

```
📋 LIST: {List Name} — {N} items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 #   Title              Department   Status   Hiring Manager   Target Start
 1   Sr. Engineer        Eng          Open     Firstname1 Lastname1   Mar 15
 2   Product Designer    Design       Open     Firstname2 Lastname2   Apr 1
 3   Data Analyst        Analytics    Closed   Firstname3 Lastname3   —
 ...

🛠️ ACTIONS
  "show item #1 details"         — full item view
  "filter by Status = Open"      — narrow down
  "export to Word"               — save as document
```

### Step 6: Explore a Document Library

Browse a library's contents:

```
workiq-ask_work_iq (
  question: "Show me the files and folders in the '<library name>' document library on the '<site name>' SharePoint site. For each item include the name, type (file or folder), size, and last modified date."
)
```

Display:

```
📚 DOCUMENT LIBRARY: {Library Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 #   Name                       Type     Size     Modified
 📁  Contracts                   Folder   —        Feb 20
 📁  Templates                   Folder   —        Feb 15
 📄  Q1 Budget.xlsx              File     245 KB   Feb 27
 📄  Team Roster.docx            File     82 KB    Feb 25
 📄  README.md                   File     4 KB     Feb 10

🛠️ ACTIONS
  "open Contracts"         — browse into folder
  "read README.md"         — preview file contents
  "show details Q1 Budget" — file metadata
  "search for 'invoice'"   — find files by name
```

### Step 7: Browse Into Folders

```
workiq-ask_work_iq (
  question: "Show me the contents of the '<folder name>' folder in the '<library name>' document library on the '<site name>' SharePoint site. Include file name, type, size, and last modified date."
)
```

### Step 8: Preview a File

For text file contents:

```
workiq-ask_work_iq (
  question: "Show me the contents of the file '<file name>' in the '<library name>' document library on the '<site name>' SharePoint site."
)
```

For metadata only:

```
workiq-ask_work_iq (
  question: "What are the metadata details for the file '<file name>' in the '<library name>' document library on the '<site name>' SharePoint site? Include size, type, created date, modified date, and author."
)
```

### Step 9: Search for Files

```
workiq-ask_work_iq (
  question: "Search for files matching '<file name or keyword>' across my SharePoint sites. Include the file name, site, library, size, and last modified date for each result."
)
```

### Step 10: List Subsites

```
workiq-ask_work_iq (
  question: "What are the subsites under the '<site name>' SharePoint site? Include each subsite's name and URL."
)
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Site | No | Browse all | Site name or URL to explore |
| View | No | Overview | "lists", "libraries", "all" |
| List/Library | No | — | Specific list or library to drill into |

## Required MCP Tools

| MCP Server | Tool | Purpose |
|---|---|---|
| workiq (Local WorkIQ CLI) | `ask_work_iq` | Site discovery, list/library browsing, schema inspection, item retrieval, file preview, and file search |

## Tips

- Start broad: "show me my SharePoint sites" to discover what's available.
- Drill down naturally: "open Marketing site" → "show lists" → "show Job Openings items."
- Say "search for 'budget'" to find files across SharePoint without knowing where they are.
- After exploring, you can create new lists or search for specific files using other WorkIQ productivity skills.

## Examples

### Example 1: Discover All Accessible Sites

> "What SharePoint sites do I have access to?"

Claude queries your accessible sites via `ask_work_iq`, then presents them in a numbered table. You can select any site by number or name to continue exploring.

---

### Example 2: Inspect a List Schema and Items

> "Show me the columns and items in the Vendor Tracker list on the Procurement site."

1. Claude searches for the Procurement site via `ask_work_iq`.
2. Retrieves all lists and locates Vendor Tracker.
3. Fetches the list schema to display column names, types, and required flags.
4. Retrieves items to show the first 20 rows in a table, with a prompt to filter or export.

---

### Example 3: Browse a Document Library and Preview a File

> "Open the Shared Documents library on the Project Alpha site and show me what's in the Contracts folder."

1. Claude resolves the site via `ask_work_iq`.
2. Lists document libraries on the site.
3. Shows top-level contents of Shared Documents.
4. Drills into the Contracts folder.
5. If you say "read README.md", Claude previews its contents inline via `ask_work_iq`.

## Error Handling

### Site Not Found

**Symptom:** `ask_work_iq` returns no results for a site name search.

**Resolution:**
- Verify the site name or URL is correct (check spelling, use a partial name for broader search).
- Try asking for all accessible sites to browse and identify the correct name.
- Confirm you have at least read access to the site in SharePoint.

---

### Permission Denied

**Symptom:** `ask_work_iq` indicates a permission or access error when querying a site, list, library, or file.

**Resolution:**
- You do not have access to that resource. Contact the site owner to request permission.
- If you own the site, verify that the connected account has the correct SharePoint role assigned.

---

### List or Library Not Found

**Symptom:** `ask_work_iq` returns lists but the expected list is missing, or no libraries are reported.

**Resolution:**
- The list may be hidden (set to not appear in navigation). Ask the site admin to confirm it exists.
- Confirm you are on the correct site — run the site search again to verify.

---

### File Too Large to Preview

**Symptom:** `ask_work_iq` cannot return the contents of a large file.

**Resolution:**
- Ask for file metadata only (size, type, modified date) instead of full content.
- Download the file directly from SharePoint for full access.

---

### Inconsistent Search Results

**Symptom:** `ask_work_iq` returns fewer site results than expected.

**Resolution:**
- SharePoint search indexes may lag by a few minutes after site creation or rename.
- Wait briefly and retry, or ask with the exact site URL if known.
