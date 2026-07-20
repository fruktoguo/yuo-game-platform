# Project Testing

- This remains a fully local static game. Players may open `index.html` directly; do not add or require a production server.
- For Codex browser verification, never navigate to a `file://` URL. Before the first browser action, start an ephemeral localhost static server, test through `http://127.0.0.1:<port>`, and stop that server after verification.
- For Codex gameplay verification, enter through the main-menu `自动测试` button. Do not test gameplay through normal mouse steering.
- Keep normal play and automatic testing on the same `index.html` entry. Do not reintroduce URL query parameters for test mode.
- Automatic testing must steer the snake independently of the mouse, automatically choose upgrades, and ignore background-pause settings so unattended runs continue.

# Project Version

- The main menu must always display the current game version in its lower-left corner.
- The current game version is `V23`.
- For every future user request that modifies this project, increment the integer version exactly once and update both the main-menu label and the current-version line in this file as part of the same change.

# Changelog

- The player-facing changelog in `index.html` is the canonical release history and starts at `V16`; do not backfill older versions unless the user explicitly asks.
- Whenever the game version is incremented, add a concise entry for that version to the changelog in the same change.
- Keep changelog entries newest-first and never remove or rewrite older entries unless the user explicitly requests it.

# Project Delivery

- After completing each user request for this project, stage only the intended PROJECT GSS0 changes and create a local Git commit automatically.
- Do not include unrelated workspace changes or generated caches in that commit.
- Do not push the commit unless the user explicitly requests a push.

# Deployment Gate

- Before any push that includes PROJECT GSS0, run the same local verification stages used by the production workflow from the repository root: `npm test`, `npm run build`, and `npm run check:limits`.
- All three commands must complete successfully against the exact commit being pushed. A scoped test, typecheck, syntax check, or earlier successful run is not a substitute.
- If any required command cannot run because of sandbox, permission, dependency, or tooling limits, explicitly report that the commit is not deployment-verified and do not push it.
- Binary snapshot tests must compare quantized floating-point fields with a precision tolerance derived from the codec; reserve exact structural assertions for lossless fields.

# Forward-Only Development

- Do not preserve compatibility with older Git revisions, releases, network protocols, snapshot formats, or saved schemas unless the user explicitly requests a migration path.
- When a format or contract changes, update every in-repository producer, consumer, and test atomically and treat the new revision as the only supported version.

# Designer Parameters

- Put every new tunable gameplay, presentation-performance, timing, growth, distance, probability, and scaling value in `designer-config.js`; do not introduce adjustable numeric literals directly in client or server runtime logic.
- Expose each new designer value in `balance-editor.html` and consume shared multiplayer values through `src/shared/designerConfig.ts` and `src/shared/constants.ts` so local and network play cannot drift.
- Structural implementation constants, binary format markers, and hard protocol safety limits may remain in code when they are not designer-adjustable.
