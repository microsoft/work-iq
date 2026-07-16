# C# / .NET Code Patterns — MCP Apps on Azure Functions

Reference for the Azure Functions MCP extension (.NET isolated worker). An **MCP Apps tool** is made of
**two functions**:

1. A **tool** decorated with `[McpToolTrigger]` + `[McpMetadata]` that declares a `ui.resourceUri`.
2. A **resource** decorated with `[McpResourceTrigger]` that serves the bundled HTML at the matching
   `ui://` URI.

The template implements this in `src/McpWeatherApp`. Source of truth:
[remote-mcp-functions-dotnet / McpWeatherApp](https://github.com/Azure-Samples/remote-mcp-functions-dotnet/tree/main/src/McpWeatherApp).

## Project layout (template)

```
remote-mcp-functions-dotnet/
├── azure.yaml                 # azd service definitions
├── infra/                     # Bicep for Flex Consumption + storage + auth
├── .vscode/
│   └── mcp.json               # local-mcp-function + remote-mcp-function servers
└── src/
    └── McpWeatherApp/
        ├── McpWeatherApp.csproj
        ├── host.json
        ├── Program.cs
        ├── <WeatherFunctions>.cs   # GetWeather tool + GetWeatherWidget resource
        └── app/               # UI (Node) — build to app/dist/index.html
            ├── package.json
            └── dist/index.html      # produced by `npm run build`
```

## Tool with UI metadata

`[McpToolTrigger]` registers the tool; `[McpMetadata]` attaches the UI metadata; `[McpToolProperty]`
declares each input argument.

```csharp
[Function(nameof(GetWeather))]
public async Task<object> GetWeather(
    [McpToolTrigger(nameof(GetWeather), "Returns current weather for a location via Open-Meteo.")]
    [McpMetadata(ToolMetadata)]
        ToolInvocationContext context,
    [McpToolProperty("location", "City name to check weather for (e.g., Seattle, New York, Miami)")]
        string location)
{
    try
    {
        var result = await _weatherService.GetCurrentWeatherAsync(location);

        if (result is WeatherResult weather)
            _logger.LogInformation("Weather fetched for {Location}: {TempC}°C", weather.Location, weather.TemperatureC);
        else if (result is WeatherError error)
            _logger.LogWarning("Weather error for {Location}: {Error}", error.Location, error.Error);

        return result;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to get weather for {Location}", location);
        return new WeatherError(location ?? "Unknown", $"Unable to fetch weather: {ex.Message}", "api.open-meteo.com");
    }
}
```

The metadata constant tells the MCP host which UI resource to fetch after the tool runs:

```csharp
private const string ToolMetadata = """
    {
        "ui": {
            "resourceUri": "ui://weather/index.html"
        }
    }
    """;
```

## Resource that serves the widget HTML

`[McpResourceTrigger]` serves the bundled UI at the same `ui://` URI. The MIME type
`text/html;profile=mcp-app` marks it as an MCP App UI resource.

```csharp
[Function(nameof(GetWeatherWidget))]
public string GetWeatherWidget(
    [McpResourceTrigger(
        "ui://weather/index.html",
        "Weather Widget",
        MimeType = "text/html;profile=mcp-app",
        Description = "Interactive weather display for MCP Apps")]
    [McpMetadata(ResourceMetadata)]
        ResourceInvocationContext context)
{
    var file = Path.Combine(AppContext.BaseDirectory, "app", "dist", "index.html");
    return File.ReadAllText(file);
}
```

> The widget HTML (`app/dist/index.html`) is produced by `npm run build` in the UI `app/` folder and
> copied to the function output. Always build the UI before running or the resource fails to read the file.

## Adding your own tool + widget

1. **Build the UI** for the new widget so a bundled `index.html` exists at a known path.
2. **Add a resource function** with `[McpResourceTrigger("ui://<name>/index.html", "<Title>", MimeType = "text/html;profile=mcp-app", Description = "...")]` that returns the bundled HTML.
3. **Add a tool function** with `[McpToolTrigger("<ToolName>", "<description>")]` + `[McpMetadata(...)]`
   whose JSON sets `ui.resourceUri` to the **same** `ui://<name>/index.html` URI.
4. Declare inputs with `[McpToolProperty("<arg>", "<description>")]` (one per argument).
5. Keep the tool name matching `^[A-Za-z0-9_]+$` (no hyphens).
6. Return structured data (an object / JSON) from the tool — the host passes it to the UI resource.
7. Rebuild, restart the host, and re-verify in Copilot (see SKILL.md step 5).

## Key contract points

- The tool's `ui.resourceUri` **must exactly match** the resource's `[McpResourceTrigger]` URI.
- Resource MIME type must be `text/html;profile=mcp-app`.
- Tool handlers should return data (not HTML); the resource returns the HTML shell/bundle.
- Handle missing/invalid input gracefully and return a well-formed error object rather than throwing.
