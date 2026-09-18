import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def assert_contains(path: str, *expected: str) -> None:
    text = (ROOT / path).read_text(encoding="utf-8")
    for item in expected:
        assert item in text, f"Missing {item!r} in {path}"


# The docs and skill guidance should clearly call out the VS Code MCP host schema.
assert_contains("plugins/workiq/README.md", '"servers": {', '"oauth": {', 'VS Code')
assert_contains("plugins/workiq-preview/README.md", '"servers": {', '"oauth": {', 'VS Code')
assert_contains("plugins/workiq/skills/workiq/SKILL.md", '"servers": {', '"oauth": {', 'VS Code')
assert_contains("plugins/workiq-preview/skills/workiq-preview/SKILL.md", '"servers": {', '"oauth": {', 'VS Code')

# The shipped sample plugin config remains valid for the GitHub Copilot CLI host.
for relpath in [
    "plugins/workiq/.mcp.json",
    "plugins/workiq-preview/.mcp.json",
]:
    with (ROOT / relpath).open("r", encoding="utf-8") as fh:
        config = json.load(fh)
    assert "mcpServers" in config, f"Missing mcpServers in {relpath}"
    assert "oauthClientId" in config["mcpServers"][relpath.split("/")[-2]], f"Missing oauthClientId in {relpath}"

print("mcp host config docs passed")
