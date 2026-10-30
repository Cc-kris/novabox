#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/dist/Novabox.app"
CONTENTS="$APP/Contents"
RES="$CONTENTS/Resources"
BUILD="$ROOT/build"
VERSION="1.1.0"
NODE_BIN="${NODE_BIN:-/usr/local/bin/node}"

rm -rf "$APP" "$BUILD/Novabox.iconset" "$BUILD/dmg" "$BUILD/pkgroot"
mkdir -p "$CONTENTS/MacOS" "$RES" "$BUILD" "$ROOT/dist"

plutil -lint "$ROOT/desktop/Resources/Info.plist"
cp "$ROOT/desktop/Resources/Info.plist" "$CONTENTS/Info.plist"

echo "==> Compiling Swift shell"
zsh -lc "swiftc -swift-version 5 -O '$ROOT'/desktop/Sources/*.swift \
  -framework AppKit -framework WebKit -framework ApplicationServices \
  -o '$CONTENTS/MacOS/Novabox'"

echo "==> Bundling web app and Node runtime"
ditto "$ROOT/app" "$RES/app"
rm -rf "$RES/app/data" "$RES/app/.run" "$RES/app/test" "$RES/app/update.json"
mkdir -p "$RES/node/bin"
cp "$NODE_BIN" "$RES/node/bin/node"
chmod +x "$RES/node/bin/node"

echo "==> Building icon"
cp "$ROOT/desktop/Resources/AppIcon-1024.png" "$BUILD/icon_1024.png"
mkdir -p "$BUILD/Novabox.iconset"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$BUILD/icon_1024.png" --out "$BUILD/Novabox.iconset/icon_${size}x${size}.png" >/dev/null
  sips -z "$((size * 2))" "$((size * 2))" "$BUILD/icon_1024.png" --out "$BUILD/Novabox.iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$BUILD/Novabox.iconset" -o "$RES/AppIcon.icns"

echo "==> Signing app (ad-hoc)"
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"

echo "==> Building pkg and dmg"
mkdir -p "$BUILD/pkgroot"
ditto "$APP" "$BUILD/pkgroot/Novabox.app"
pkgbuild --root "$BUILD/pkgroot" --identifier com.novabox.desktop --version "$VERSION" \
  --install-location /Applications "$ROOT/dist/Novabox-$VERSION.pkg" >/dev/null

mkdir -p "$BUILD/dmg"
ditto "$APP" "$BUILD/dmg/Novabox.app"
ln -s /Applications "$BUILD/dmg/Applications"
hdiutil create -volname "Novabox" -srcfolder "$BUILD/dmg" -ov -format UDZO \
  "$ROOT/dist/Novabox-$VERSION.dmg" >/dev/null

ditto -c -k --sequesterRsrc --keepParent "$APP" "$ROOT/dist/Novabox-$VERSION-macOS.zip"

echo "==> Output"
ls -lh "$ROOT/dist/Novabox-$VERSION.pkg" "$ROOT/dist/Novabox-$VERSION.dmg" "$ROOT/dist/Novabox-$VERSION-macOS.zip"
du -sh "$APP"
