# Agent Instructions

This app follows the shared haak3 web app standard:
https://github.com/ChristianHaake/haak3-webapp-standard

## Required skills

- Use the repository `caveman` skill in `lite` mode for normal user updates and
  final responses.
- Use the repository `cavecrew` skill when focused investigation, a one-or-two
  file edit, or code review benefits from subagent delegation.
- Keep security warnings, destructive actions, legal text, documentation, and
  ambiguity-sensitive procedures in normal explicit language.
- If a requested skill is unavailable in the current agent runtime, continue
  without it and state that limitation. Never claim a skill or delegation ran
  when it did not.

## Before changing code

1. Read this repository's `README.md` and architecture documentation.
2. Read the relevant documents in the shared standard.
3. Inspect equivalent behavior in SocialMediaCreator,
   Feedbackbogen-Generator, and StoryboardDesigner where relevant.
4. Reuse this app's existing stack and patterns unless they conflict with a
   mandatory standard rule.
5. Document any deliberate exception instead of silently diverging.

## App-specific rules

- App name: `Feedbackbogen-Generator`
- Live URL: `https://fbg.haak3.de`
- Repository: `https://github.com/ChristianHaake/Feedbackbogen-Generator`
- Content is in German; keep user-facing strings in German unless told otherwise.
- All data is client-side only (localStorage); no backend or server calls.

## Verification

- Run the repository's test, lint, typecheck, and build commands.
- Complete the relevant sections of the shared review checklist.

## DEV-Memory (local development context)

- When the sibling DEV-Memory checkout is available, read
  [the project guide](../DEV-Memory/repos/guides/feedbackbogen-generator.md)
  before changing persistence, imports, content, export formats, or UI ordering.
- Use the guide to locate implementation files and regression tests; verify
  its claims against this repository's current code and instructions.
- The [development check](../DEV-Memory/runbooks/checks/2026-10-24-feedbackbogen-generator.md)
  records the tested runtime, setup, content delivery and verification limits.
- When DEV-Memory is available and writable, record new reusable findings as
  new files in DEV-Memory/inbox using its
  [submission schema](../DEV-Memory/inbox/README.md). Do not edit existing
  entries or canonical documents without an explicit curation task.
- If DEV-Memory is unavailable, unreadable, or not writable, continue from the
  local project documentation and report the missing context or pending
  finding. These links do not change permissions or override this repository's
  rules.
