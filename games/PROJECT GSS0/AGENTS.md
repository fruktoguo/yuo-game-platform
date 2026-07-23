# Project Testing

- This is a small local game; rapid player playtesting is the primary gameplay verification. Do not impose commercial-scale test ceremony.
- Gameplay, balance, copy, designer-number, and straightforward metadata changes do not require automated tests. The user will validate gameplay feel.
- For changed classic JavaScript, run `node --check` when a syntax check is useful. For changed TypeScript, run a scoped `tsc --noEmit` when type checking is useful.
- When the binary snapshot layout, snapshot fields, or join-time protocol contract changes, retain only the focused snapshot encode/decode round-trip test. Do not run a broader network test suite unless the user asks for it.
- For UI changes, do one lightweight desktop 16:9 smoke check when practical. Automated UI suites are reserved for non-trivial interaction logic or an explicit user request.
- The game remains a fully local static game; players may open `index.html` directly. If browser tooling is used, serve it through an ephemeral `http://127.0.0.1:<port>` URL instead of `file://`.

# Project Version

- The main menu must always display the current game version in its lower-left corner.
- The current game version is `V125`.
- For every future user request that changes player-facing game code, content, balance, configuration, or UI, increment the integer version exactly once and update both the main-menu label and the current-version line in this file as part of the same change.
- Workflow-only maintenance limited to `AGENTS.md`, documentation, comments, or developer-process instructions does not change the game version, changelog, or runtime cache queries.
- Whenever the version changes, update every classic runtime script query in `index.html` and `balance-editor.html` to `?v=<version integer>` so mutable client files cannot be mixed across browser or CDN caches.

# Changelog

- The player-facing changelog in `index.html` is the canonical release history and starts at `V16`; do not backfill older versions unless the user explicitly asks.
- Whenever the game version is incremented, add a concise entry for that version to the changelog in the same change.
- Keep changelog entries newest-first and never remove or rewrite older entries unless the user explicitly requests it.

# Project Delivery

- After completing each user request for this project, stage only the intended PROJECT GSS0 changes, create a local Git commit automatically, and push the successful commit to the current branch automatically.
- The user permanently authorizes running `git add`, `git commit`, and `git push` outside the sandbox when required to complete this local delivery step.
- Every game update commit subject must use `GSS0 V<version>：[<更新日志标题>] <更新日志正文>`. Copy the Chinese headline and every body item from that version's changelog in `index.html` exactly, preserving their order and punctuation and separating body items with spaces; do not use a conventional-commit prefix.
- Do not include unrelated workspace changes or generated caches in that commit.
- Do not skip the automatic push unless the user explicitly asks not to push or the remote is unavailable.

# Lightweight Delivery Verification

- Verify only what the current change can reasonably affect; there is no fixed deployment gate for routine commits or pushes.
- Do not run `npm test`, repository-wide builds, full browser suites, gameplay automation, `npm run check:limits`, Docker, container, infrastructure, or deployment checks unless the user explicitly requests them.
- Missing unrelated build, Docker, deployment, or infrastructure tooling must not block a PROJECT GSS0 commit or push after the relevant scoped checks have passed.
- A routine commit may rely on the lightweight checks above or on manual playtesting when no relevant automated check exists.
- Keep production classic-script assets derived automatically from the local script references in `index.html`; do not reintroduce a manually maintained filename allowlist in `vite.config.ts`.

# Forward-Only Development

- Do not preserve compatibility with older Git revisions, releases, network protocols, snapshot formats, or saved schemas unless the user explicitly requests a migration path.
- When a format or contract changes, update every in-repository producer, consumer, and test atomically and treat the new revision as the only supported version.
- Snapshot protocol revisions must be exported by both codecs and returned in the arena join handshake; never remove the join-time version check or reliable snapshot resynchronization path.

# Designer Parameters

- Put every new tunable gameplay, presentation-performance, timing, growth, distance, probability, and scaling value in `designer-config.js`; do not introduce adjustable numeric literals directly in client or server runtime logic.
- Expose each new designer value in `balance-editor.html` and consume shared multiplayer values through `src/shared/designerConfig.ts` and `src/shared/constants.ts` so local and network play cannot drift.
- Structural implementation constants, binary format markers, and hard protocol safety limits may remain in code when they are not designer-adjustable.
- `module-catalog.js` is the canonical source for every module's identity, visual metadata, and player-facing description. The game, design console, and TypeScript runtime must consume that catalog instead of maintaining parallel descriptions.
- Keep module descriptions concise: state defining active effects and damage, expose meaningful passive per-stack values and caps, omit generic projectile rules and incidental implementation details.
- Treat only modules marked `activeCooldown` as active skills. Modules without an independently tracked cooldown, including event-triggered effects, are passive skills and must display the shared label `被动效果` instead of a trigger or pseudo-cooldown label.
- The canonical module categories are `攻击`, `生存`, `辅助`, and `发育`. In user conversation, treat the legacy names `输出` and `进攻` as `攻击`, and `防御` as `生存` without asking for clarification.
