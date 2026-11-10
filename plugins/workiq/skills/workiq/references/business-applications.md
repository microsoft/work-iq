# Business Applications discovery and reads

Use `/businessapps/` for CRM, ERP and Power Apps records, environments and
operations. These are not Graph application registrations or this plugin's
Markdown skills. Do not substitute another MCP server or invent an API URL.

## Discover the application and paths

For a business-record or workflow request, start with the read-only discovery
action `do_action` `/businessapps/me`:

```json
{"actionUrl":"/businessapps/me","jsonBody":{"query":"{requestedBusinessTask}"}}
```

The required query describes the user's task. Include an environmentId or limit
only when the connected contract supports it and the environment is already
known. For an explicit environment listing, use `fetch`
`/businessapps/environments/`. Natural-language `search_paths` is another
discovery option, not a fallback after denial.

Take every environment, app, table, record, skill, API and operation identifier
from returned paths. Preserve casing and opaque IDs; never assume a default
environment. Inspect the returned definition/schema when needed to distinguish
reads from operations that change data or delegate work.

## Exact reads and queries

Use the following inherited shapes only after discovery confirms the resource:

| Request | Tool and discovered path |
| --- | --- |
| Inspect tables | fetch or get_schema on `/businessapps/environments/{environmentId}/tables/{tableName}` |
| Read a record | fetch `/businessapps/environments/{environmentId}/tables/{tableName}/records/{recordId}` |
| Inspect an app | fetch `/businessapps/environments/{environmentId}/apps/{appName}` |
| List an app's custom operations | get_schema on `/businessapps/environments/{environmentId}/apps/{appName}`; its app-level operations are the app's custom operations |
| List/read an environment business skill | fetch `/businessapps/environments/{environmentId}/skills` or its returned skill path |
| Query environment data | do_action `/businessapps/environments/{environmentId}/query`, with schema-defined `{"querytext":"{supportedReadQuery}"}` |
| Download a record file | call_function on the discovered `.../records/{recordId}/files/{columnName}/download` path |

Environment SQL queries use do_action, not call_function. Establish that the
query is read-only and supported; do not generate a write query under a read
request. Use optional destinationPath only when supported. Record-file download
does not establish a Graph fetch_blob or OneDrive upload contract.

App operations omit `/records/` and exist at two levels: table-level record
operations under `.../apps/{appName}/tables/{tableName}`, and app-level custom
operations a maker added to the app under `.../apps/{appName}/operations/`.
Use only exact paths and operation names returned by get_schema. If the schema
exposes a read-only `view` or `read` action, use its supported arguments; never
construct an app operation from an environment record path.

## Results and stopping

Report only returned records and fields, with their actual names and safe source
links where available. Follow supported paging for requested completeness or
disclose partial results. Missing fields, failed reads and empty results differ.
Business metadata comes from discovery/schema results, not a delegated answer.

Explicit access, privilege or policy denial stops the workflow. Do not switch
tables, views, app operations, agents or endpoints to work around it.
Read [recovery](troubleshooting.md) before any permitted retry.

## Routes

| Route | Intent | Read |
| --- | --- | --- |
| businessapps-actions | Create, update, delete, upload or execute a business operation | [Actions](business-applications-actions.md) |
