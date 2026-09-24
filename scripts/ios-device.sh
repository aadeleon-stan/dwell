#!/usr/bin/env bash
# Build a Release copy of Dwell and install it on the connected iPhone.
# Used instead of `expo run:ios`, which fails to find the Simulator on Xcode 27.
set -euo pipefail
cd "$(dirname "$0")/.."

DEVICE_ID=$(xcrun devicectl list devices --json-output /dev/stdout 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const json = JSON.parse(s.slice(s.indexOf("{")));
    const phone = json.result.devices.find(
      (d) => d.hardwareProperties.platform === "iOS" && d.connectionProperties.tunnelState !== "unavailable");
    if (phone) console.log(phone.hardwareProperties.udid);
  });')
if [ -z "$DEVICE_ID" ]; then
  echo "No connected iPhone found. Plug it in, unlock it, and try again." >&2
  exit 1
fi

CI=1 npx expo prebuild -p ios
# prebuild rewrites the ios/android scripts to `expo run:*`; keep the Expo Go ones
node -e '
  const fs = require("fs");
  const p = JSON.parse(fs.readFileSync("package.json"));
  p.scripts.ios = "expo start --ios";
  p.scripts.android = "expo start --android";
  fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");'
(cd ios && pod install)

BUILD_DIR=ios/build
xcodebuild -workspace ios/Dwell.xcworkspace -scheme Dwell -configuration Release \
  -destination "id=$DEVICE_ID" -derivedDataPath "$BUILD_DIR" \
  -allowProvisioningUpdates -quiet build

xcrun devicectl device install app --device "$DEVICE_ID" \
  "$BUILD_DIR/Build/Products/Release-iphoneos/Dwell.app"
echo "Installed Dwell on the iPhone."
