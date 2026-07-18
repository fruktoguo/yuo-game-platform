# Project Testing

- This is a fully local static game. Open `index.html` directly; do not add or require a server.
- For Codex gameplay verification, enter through the main-menu `自动测试` button. Do not test gameplay through normal mouse steering.
- Keep normal play and automatic testing on the same `index.html` entry. Do not reintroduce URL query parameters for test mode.
- Automatic testing must steer the snake independently of the mouse, automatically choose upgrades, and ignore background-pause settings so unattended runs continue.
