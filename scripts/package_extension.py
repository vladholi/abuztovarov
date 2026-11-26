"""Build a Chrome Web Store ZIP from the extension's runtime files."""
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "avito-margin-scout-v6"
FILES = (
    "manifest.json", "popup.html", "popup.js", "dashboard.html", "dashboard.js",
    "style.css", "engine.js", "location.js", "background.js",
    "icons/icon-48.png", "icons/icon-128.png",
)


def main():
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    if manifest["manifest_version"] != 3 or not 0 < len(manifest["description"]) <= 132:
        raise ValueError("Expected a Manifest V3 extension with a 1–132 character description")
    version = manifest["version"]
    if not re.fullmatch(r"(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,3}", version):
        raise ValueError("Invalid Chrome version format")
    parts = [int(part) for part in version.split(".")]
    if not any(parts) or max(parts) > 65535:
        raise ValueError("Chrome version component out of range")
    resources = [manifest["action"]["default_popup"], manifest["background"]["service_worker"],
                 *manifest["icons"].values()]
    if set(resources).difference(FILES):
        raise ValueError("A manifest resource is missing from the package list")
    output = ROOT / "dist" / f"avito-margin-scout-{version}.zip"
    output.parent.mkdir(exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for name in FILES:
            archive.write(SOURCE / name, name)
    with ZipFile(output) as archive:
        if archive.testzip() or set(archive.namelist()) != set(FILES):
            raise ValueError("Invalid release archive")
    print(output)


if __name__ == "__main__":
    main()
