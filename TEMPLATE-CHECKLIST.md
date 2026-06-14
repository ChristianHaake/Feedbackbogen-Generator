# New Repository Checklist

Delete this file after setup is complete.

## Replace placeholders

Search the repository for `{{` and replace every placeholder.

## Select the stack

- [ ] Initialize the chosen Vite and TypeScript setup.
- [ ] Add strict TypeScript configuration.
- [ ] Add `dev`, `build`, `test`, `lint`, `typecheck`, and `verify` scripts.
- [ ] Pin the supported Node major version.

## Agent skills

- [ ] Confirm Codex discovers `.agents/skills/caveman` and
  `.agents/skills/cavecrew`.
- [ ] Confirm Claude Code discovers `.claude/skills/caveman` and
  `.claude/skills/cavecrew`.
- [ ] Test explicit `/caveman` or `$caveman` invocation.
- [ ] Test cavecrew fallback when subagent tools are unavailable.

## Complete the application shell

- [ ] Header with app identity and accurate local-processing message.
- [ ] Footer with Hilfe, Über, Datenschutz, Impressum, and repository links.
- [ ] Direct navigation works for every content route.
- [ ] Semantic design tokens follow the shared design system.

## Verify production behavior

- [ ] Adjust `public/_headers` to actual network and embedding requirements.
- [ ] Complete and review privacy and imprint content.
- [ ] Confirm storage, reset, import, and export behavior.
- [ ] Complete `docs/review-checklist.md`.

## License

- [ ] Confirm that `LICENSE`, README, and package metadata all declare
  `GPL-3.0-only`.
