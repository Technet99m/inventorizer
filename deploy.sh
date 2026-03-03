#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

bump="patch"
no_increment=false
yolo=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -patch) bump="patch" ;;
    -minor) bump="minor" ;;
    -major) bump="major" ;;
    --no-increment) no_increment=true ;;
    --yolo) yolo=true ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
  shift
done

if $yolo; then
  echo "Skipping tests (--yolo)"
else
  echo "Running pnpm test:ci"
  pnpm test:ci
fi

if $no_increment; then
  new_version=$(node -e "const pkg = require('$SCRIPT_DIR/package.json'); console.log(pkg.version);")
  echo "Skipping version increment, using existing version $new_version"
else
new_version=$(
  BUMP_TYPE="$bump" PACKAGE_JSON="$SCRIPT_DIR/package.json" node <<'NODE'
const fs = require('node:fs');

const packagePath = process.env.PACKAGE_JSON;
const bumpType = process.env.BUMP_TYPE || 'patch';

if (!packagePath) {
  throw new Error('PACKAGE_JSON environment variable is required');
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const versionParts = pkg.version.split('.').map((part) => Number(part));

if (
  versionParts.length !== 3 ||
  versionParts.some((number) => Number.isNaN(number) || number < 0)
) {
  throw new Error(`package.json has invalid version: ${pkg.version}`);
}

let [major, minor, patch] = versionParts;
switch (bumpType) {
  case 'major':
    major += 1;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor += 1;
    patch = 0;
    break;
  case 'patch':
    patch += 1;
    break;
  default:
    throw new Error(`Unsupported bump type: ${bumpType}`);
}

const newVersion = [major, minor, patch].join('.');
pkg.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log(newVersion);
NODE
)

echo "Bumped package.json version to $new_version"
fi

# Build Docker image
docker build -t inventorizer:latest .

# Tag Docker image
docker tag inventorizer:latest technet99m/inventorizer:latest

# Push to registry
docker push technet99m/inventorizer:latest
