# Learnings

- 2026-10-13: No PowerShell Gallery for now. The user chose the install from a clone: the Gallery only takes a personal Microsoft account, which is too much effort for the marketing effect. The module stays in the repository and is loaded from the clone.
- 2026-10-13: PSReadLine stops emitting token colours inside a selection (`Render.cs`, `UpdateColorsIfNecessary`), so `Selection` needs a foreground of its own: the foundation's `selection_text` on the `selection` overlay. `ListPredictionSelected` is drawn under the row and stays a background alone.
- 2026-10-13: `Set-PSReadLineOption -Colors` throws at the first key it does not know and leaves the rest of the table unset; the keys before it are applied, in hashtable order. Keys that a supported PSReadLine version lacks go in a call of their own inside `try`/`catch`.
- 2026-10-13: Generated PowerShell files stay ASCII: Windows PowerShell 5.1 reads a script without a byte order mark in the ANSI code page, and it is the host that prints the version warning.
- 2026-10-13: With `-EncodedCommand`, PowerShell may write progress and errors to stderr as CLIXML. A test judges by exit status and stdout.
- 2026-10-13: Under `RemoteSigned`, the default on Windows, PowerShell refuses the unsigned script and module from a UNC path, and a WSL folder (`\\wsl.localhost\…`) is one. The README tells Windows users to clone to a local drive; the tests pass `-ExecutionPolicy Bypass`.
