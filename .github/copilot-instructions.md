# NHS Notify Digital Letters General

Our core programming language is typescript, but also Python.

Our docs are in [.docs](./docs) and are built with Jekyll.

This repository is for handling pre rendered letters, handling them for print and also making available for digital viewing. If viewed digitally, then they won't be printed.

This is just one sub domain of the whole of NHS Notify. Inside of this subdomain, there are a number of services, each with a number of microservices. The service could be a bounded context with separate deployability.

Services communicate in an event driven manner, using cloud events. Digital letters has its own Event Bridge, and any events to share with the wider NHS Notify system are forwarded to the core Event Bridge.

You can build docs with `make build` in [.docs](./docs), you will need to `make install` first. This will output to [.docs/_site](./docs/_site). Once this is built you can find out about our architecture at [./docs/site/architecture/c4/index.html](./docs/site/architecture/c4/index.html). It is event driven, events can all be found at [./docs/_site/events.html](./docs/_site/events.html)

All of our events will have their schemas stored in [./schemas/events](./schemas/events). These schemas are used for validation and code generation. The schemas are written in yaml and follow the json schema spec. You can find out more about json schema at [https://json-schema.org/](https://json-schema.org/).

For each event, there will be a schema for the envelope (this is cloud events, and will reference the default NHS Notify cloudevent profile schema). And there will also be a schema for the data payload. The data payload schema will be referenced in the envelope schema.

## Copilot Instructions for src/ Testing

**When working on testing implementation in the `src/` directory:**

1. **Check the "Current Actions and Todos" section in `../TESTING_PLAN.md` first** - This shows what's currently being worked on and what's next. When starting a new chat or continuing work, review this section to understand the current state and pick up where we left off.

2. **Always update the "Current Actions and Todos" section in `../TESTING_PLAN.md`** when starting new work, completing tasks, or encountering blockers. This section should always reflect the current state of work.

3. **Always update the Implementation Progress Tracker section in `../TESTING_PLAN.md`** when completing any implementation tasks

4. **Always add an entry to the Implementation Changelog section in `../TESTING_PLAN.md`** for each implementation activity - add new entries at the TOP in reverse chronological order with **date and time in UK timezone (YYYY-MM-DD HH:MM GMT/BST format)**, author, activity summary, changes made, files modified, and current status. **CRITICAL: Use the ACTUAL CURRENT time in GMT/BST - run `date -u` to get the correct timestamp. Do not make up or guess timestamps.** **Include changelog entries for updates to the TESTING_PLAN.md document itself.**

5. **Use proper markdown code fence language specifiers** - never use just ` ``` `, always specify the language (e.g., ` ```bash `, ` ```python `, ` ```typescript `, ` ```makefile `, ` ```plain `)

6. **Ensure all internal links are valid** - test that section references work correctly in TESTING_PLAN.md

7. **Keep the TESTING_PLAN.md synchronized** with actual implementation state

8. **Update timestamps** in the document status section when making changes

9. **Follow the phased approach** - complete phases in order and track progress

10. **Mark checkboxes** (✅/❌) in the progress tracker as work is completed

11. **Add notes** to the progress tracker for any deviations or important decisions

12. **Run pre-commit hooks before committing** - Always stage modified files with `git add <files>`, then change to the repository root directory (`cd /workspaces/nhs-notify-digital-letters`), and run `.git/hooks/pre-commit` to ensure all pre-commit hooks pass before committing changes. All hooks must pass successfully.

13. **Vale vocabulary exceptions** - If vale reports false positives for legitimate technical terms, you may add them to `scripts/config/vale/styles/config/vocabularies/words/accept.txt` (one word per line, alphabetically sorted). **IMPORTANT**: Always document any additions to accept.txt in the changelog with justification for why the word is legitimate.

14. **npm workspace test convention** - For projects with `package.json` that are part of the npm workspace (listed in root package.json workspaces), tests must be executable via `npm run test:unit`. The project's Makefile `test` target should call `npm run test:unit` to align with the workspace-wide test execution pattern (`npm run test:unit --workspaces`).

15. **Python environment setup** - For Python projects, always use `configure_python_environment` tool to set up the Python environment before running tests or installing dependencies. When VS Code prompts to select which requirements file to install, **always select `requirements-dev.txt`** (not `requirements.txt`) as it includes all testing dependencies plus production dependencies.

16. **Update unit.sh for CI/CD integration** - When adding tests for a new project, you **MUST** update `scripts/tests/unit.sh` to include:
    - Installation of prerequisites (e.g., `make -C ./src/project-name install-dev` for Python projects)
    - Execution of the test suite (e.g., `make -C ./src/project-name test`)
    - The CI/CD pipeline runs `make test-unit` which calls `scripts/tests/unit.sh`
    - This file is used by `.github/workflows/stage-2-test.yaml` in the "Run unit test suite" step
    - Always test that the prerequisites install correctly before running tests
    - Add a comment in unit.sh explaining what each section does

17. **Use GitHub CLI for monitoring CI/CD** - When monitoring GitHub Actions workflow runs:
    - **CRITICAL**: Always prefix `gh` commands with `GH_PAGER=cat` to disable the pager that requires pressing 'q' to exit
    - Use `GH_PAGER=cat gh run list --branch <branch-name> --limit <n> --json databaseId,status,conclusion,name,createdAt,url` to list recent workflow runs
    - Use `GH_PAGER=cat gh run view <run-id> --json conclusion,status,jobs` to view details of a specific run
    - Use `gh run watch <run-id>` to watch a run in progress (this one is interactive, so it's OK without GH_PAGER)
    - If `gh` commands fail with "No default remote repository", run `gh repo set-default NHSDigital/nhs-notify-digital-letters`
    - If authentication is required, the user will handle `gh auth login`
    - **Examples**:
      - List runs: `GH_PAGER=cat gh run list --branch rossbugginsnhs/2025-11-04/eventcatalog-001 --limit 5 --json databaseId,status,conclusion,name,url`
      - View run: `GH_PAGER=cat gh run view <run-id> --json conclusion,status,jobs`
      - With jq: `GH_PAGER=cat gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion == "failure") | {name: .name, conclusion: .conclusion}'`

18. **Use SonarCloud API for coverage monitoring** - To check coverage metrics on branches:
    - **Public API (no auth required)**: `https://sonarcloud.io/api/measures/component`
    - **Parameters**:
      - `component`: `NHSDigital_nhs-notify-digital-letters` (project) or `NHSDigital_nhs-notify-digital-letters:src/project-name` (specific component)
      - `branch`: URL-encoded branch name (e.g., `rossbugginsnhs/2025-11-04/eventcatalog-001`)
      - `metricKeys`: `coverage,new_coverage,lines_to_cover,new_lines_to_cover`
    - **Example**: `curl -s "https://sonarcloud.io/api/measures/component?component=NHSDigital_nhs-notify-digital-letters:src/asyncapigenerator&branch=rossbugginsnhs/2025-11-04/eventcatalog-001&metricKeys=coverage,new_coverage,lines_to_cover,new_lines_to_cover" | python3 -m json.tool`
    - Use this to verify coverage is being detected after SonarCloud configuration changes
    - Look for `new_coverage` in the response - should not be 0.0% if tests are working

## Quick Reference

- **TESTING_PLAN.md**: Main testing plan document with progress tracker and changelog
- **TESTING_QUICK_REFERENCE.md**: Quick reference for testing patterns
- **Pre-commit hooks**: `bash scripts/githooks/pre-commit.sh` (run from repository root)
- **Coverage target**: 80%+ for all projects
- **Test command**: `make test` in each project directory
