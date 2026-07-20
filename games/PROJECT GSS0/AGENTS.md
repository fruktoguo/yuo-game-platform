# Project Testing

- Run automated tests only when the requested change includes UI or UX work.
- For gameplay, balance, networking, simulation, server, or non-UI configuration changes, do not run automated tests or automated gameplay verification; the user will perform gameplay validation.
- When a request combines UI/UX and gameplay work, test only because UI/UX is in scope and keep verification focused on the affected interface flows.
- Syntax checks, typechecks, production builds, and the deployment checks below are not considered automated tests and may still be run when required for delivery safety.
- This remains a fully local static game. Players may open `index.html` directly; do not add or require a production server.
- For Codex browser verification, never navigate to a `file://` URL. Before the first browser action, start an ephemeral localhost static server, test through `http://127.0.0.1:<port>`, and stop that server after verification.
- For Codex gameplay verification, enable the top-right `自动模式` setting and enter through the required `单人模式` or `多人模式` button. Do not test gameplay through normal mouse steering.
- Keep normal play and automatic testing on the same `index.html` entry. Do not reintroduce URL query parameters for test mode.
- Automatic mode must only steer the snake independently of manual input, automatically choose upgrades, and automatically restart after death. It must respect the separate background-pause setting; disable background pause explicitly for unattended verification.

# Project Version

- The main menu must always display the current game version in its lower-left corner.
- The current game version is `V39`.
- For every future user request that modifies this project, increment the integer version exactly once and update both the main-menu label and the current-version line in this file as part of the same change.
- Whenever the version changes, update every classic runtime script query in `index.html` and `balance-editor.html` to `?v=<version integer>` so mutable client files cannot be mixed across browser or CDN caches.

# Changelog

- The player-facing changelog in `index.html` is the canonical release history and starts at `V16`; do not backfill older versions unless the user explicitly asks.
- Whenever the game version is incremented, add a concise entry for that version to the changelog in the same change.
- Keep changelog entries newest-first and never remove or rewrite older entries unless the user explicitly requests it.

# Project Delivery

- After completing each user request for this project, stage only the intended PROJECT GSS0 changes and create a local Git commit automatically.
- The user permanently authorizes running `git add` and `git commit` outside the sandbox when required to complete this local delivery step.
- Do not include unrelated workspace changes or generated caches in that commit.
- Do not push the commit unless the user explicitly requests a push.

# Deployment Gate

- PROJECT GSS0 automated unit tests are not a deployment gate. Do not require `npm test` before committing, pushing, or deploying this project.
- Before any push that includes PROJECT GSS0, run the remaining production verification stages from the repository root: `npm run build` and `npm run check:limits`.
- Both commands must complete successfully against the exact commit being pushed. A scoped typecheck, syntax check, or earlier successful run is not a substitute.
- If any required command cannot run because of sandbox, permission, dependency, or tooling limits, explicitly report that the commit is not deployment-verified and do not push it.

# Forward-Only Development

- Do not preserve compatibility with older Git revisions, releases, network protocols, snapshot formats, or saved schemas unless the user explicitly requests a migration path.
- When a format or contract changes, update every in-repository producer, consumer, and test atomically and treat the new revision as the only supported version.
- Snapshot protocol revisions must be exported by both codecs and returned in the arena join handshake; never remove the join-time version check or reliable snapshot resynchronization path.

# Designer Parameters

- Put every new tunable gameplay, presentation-performance, timing, growth, distance, probability, and scaling value in `designer-config.js`; do not introduce adjustable numeric literals directly in client or server runtime logic.
- Expose each new designer value in `balance-editor.html` and consume shared multiplayer values through `src/shared/designerConfig.ts` and `src/shared/constants.ts` so local and network play cannot drift.
- Structural implementation constants, binary format markers, and hard protocol safety limits may remain in code when they are not designer-adjustable.
