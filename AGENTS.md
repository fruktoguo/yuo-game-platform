# Local-Only Generated Files

- Treat `output/imagegen/` and `tmp/` as permanently local-only working directories.
- Never stage, commit, or push files from either directory, including generated concept art, screenshots, prompts, contact sheets, and temporary assets.
- Never use force-add or another ignore-bypassing workflow for these directories unless the user explicitly reverses this policy.
- If files in either directory are already tracked, remove them from the Git index while preserving the local copies.
