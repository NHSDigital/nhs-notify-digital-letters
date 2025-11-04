# Copilot Instructions for src/ Testing

**When working on testing implementation in the `src/` directory:**

1. **Always update the Implementation Progress Tracker section in `../TESTING_PLAN.md`** when completing any implementation tasks

2. **Always add an entry to the Implementation Changelog section in `../TESTING_PLAN.md`** for each implementation activity - add new entries at the TOP in reverse chronological order with **date and time in UK timezone (YYYY-MM-DD HH:MM GMT/BST format)**, author, activity summary, changes made, files modified, and current status. **Include changelog entries for updates to the TESTING_PLAN.md document itself.**

3. **Use proper markdown code fence language specifiers** - never use just ` ``` `, always specify the language (e.g., ` ```bash `, ` ```python `, ` ```typescript `, ` ```makefile `, ` ```plain `)

4. **Ensure all internal links are valid** - test that section references work correctly in TESTING_PLAN.md

5. **Keep the TESTING_PLAN.md synchronized** with actual implementation state

6. **Update timestamps** in the document status section when making changes

7. **Follow the phased approach** - complete phases in order and track progress

8. **Mark checkboxes** (✅/❌) in the progress tracker as work is completed

9. **Add notes** to the progress tracker for any deviations or important decisions

10. **Run pre-commit hooks before committing** - Always stage modified files with `git add <files>`, then change to the repository root directory (`cd /workspaces/nhs-notify-digital-letters`), and run `bash scripts/githooks/pre-commit.sh` to ensure all pre-commit hooks pass before committing changes. All hooks must pass successfully.

11. **Vale vocabulary exceptions** - If vale reports false positives for legitimate technical terms, you may add them to `scripts/config/vale/styles/config/vocabularies/words/accept.txt` (one word per line, alphabetically sorted). **IMPORTANT**: Always document any additions to accept.txt in the changelog with justification for why the word is legitimate.

12. **npm workspace test convention** - For projects with `package.json` that are part of the npm workspace (listed in root package.json workspaces), tests must be executable via `npm run test:unit`. The project's Makefile `test` target should call `npm run test:unit` to align with the workspace-wide test execution pattern (`npm run test:unit --workspaces`).

13. **Python environment setup** - For Python projects, always use `configure_python_environment` tool to set up the Python environment before running tests or installing dependencies. When VS Code prompts to select which requirements file to install, **always select `requirements-dev.txt`** (not `requirements.txt`) as it includes all testing dependencies plus production dependencies.

14. **Update unit.sh for CI/CD integration** - When adding tests for a new project, you **MUST** update `scripts/tests/unit.sh` to include:
    - Installation of prerequisites (e.g., `make -C ./src/project-name install-dev` for Python projects)
    - Execution of the test suite (e.g., `make -C ./src/project-name test`)
    - The CI/CD pipeline runs `make test-unit` which calls `scripts/tests/unit.sh`
    - This file is used by `.github/workflows/stage-2-test.yaml` in the "Run unit test suite" step
    - Always test that the prerequisites install correctly before running tests
    - Add a comment in unit.sh explaining what each section does

## Quick Reference

- **TESTING_PLAN.md**: Main testing plan document with progress tracker and changelog
- **TESTING_QUICK_REFERENCE.md**: Quick reference for testing patterns
- **Pre-commit hooks**: `bash scripts/githooks/pre-commit.sh` (run from repository root)
- **Coverage target**: 80%+ for all projects
- **Test command**: `make test` in each project directory
