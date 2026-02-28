# Backlog

## `council install` — Cross-platform support

The `install` command currently only supports macOS (.app bundle). To support other platforms:

### Windows
- Create a `.lnk` shortcut or `.bat`/`.cmd` launcher in `%APPDATA%\Microsoft\Windows\Start Menu\Programs\`
- Alternatively, use a `.vbs` script to launch electron without a console window
- Shortcuts can be created programmatically via PowerShell or the `windows-shortcuts` npm package
- Replace `osascript` error dialog with a native alternative (e.g. PowerShell `[System.Windows.MessageBox]`)

### Linux
- Create a `.desktop` file in `~/.local/share/applications/`
- Simple text format similar in spirit to the macOS plist

## macOS menu bar still shows "Electron"

The lightweight .app wrapper uses a shell script that `exec`s the Electron binary. macOS reads the bold menu bar title from the process's code signature, which says "Electron". Symlinks, copies, and hard links all fail due to code signing (SIGTRAP crash).

The menu dropdown items, window title, Spotlight, Dock, and crash reports all correctly show "State Change Council" — only the bold menu bar title is wrong.

**Fix:** Use `electron-builder` to package a proper app with a renamed, re-signed binary. This would replace the lightweight wrapper approach for macOS.
