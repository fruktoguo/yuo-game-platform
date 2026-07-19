# Project Testing

- This is a fully local static game. Open `index.html` directly; do not add or require a server.
- For Codex gameplay verification, enter through the main-menu `自动测试` button. Do not test gameplay through normal mouse steering.
- Keep normal play and automatic testing on the same `index.html` entry. Do not reintroduce URL query parameters for test mode.
- Automatic testing must steer the snake independently of the mouse, automatically choose upgrades, and ignore background-pause settings so unattended runs continue.

# Project Version

- The main menu must always display the current game version in its lower-left corner.
- The current game version is `V3`.
- For every future user request that modifies this project, increment the integer version exactly once and update both the main-menu label and the current-version line in this file as part of the same change.

# Forward-Only Development

- Do not preserve compatibility with older Git revisions, releases, network protocols, snapshot formats, or saved schemas unless the user explicitly requests a migration path.
- When a format or contract changes, update every in-repository producer, consumer, and test atomically and treat the new revision as the only supported version.
