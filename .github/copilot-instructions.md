# NHS Notify Digital Letters General

Our core programming language is typescript, but also Python.

Our docs are in [.docs](./docs) and are built with Jekyll.

This repository is for handling pre rendered letters, handling them for print and also making available for digital viewing. If viewed digitally, then they won't be printed.

This is just one sub domain of the whole of NHS Notify. Inside of this subdomain, there are a number of services, each with a number of microservices. The service could be a bounded context with separate deployability.

Services communicate in an event driven manner, using cloud events. Digital letters has its own Event Bridge, and any events to share with the wider NHS Notify system are forwarded to the core Event Bridge.

You can build docs with `make build` in [.docs](./docs), you will need to `make install` first. This will output to [.docs/_site](./docs/_site). Once this is built you can find out about our architecture at [./docs/site/architecture/c4/index.html](./docs/site/architecture/c4/index.html). It is event driven, events can all be found at [./docs/_site/events.html](./docs/_site/events.html)

All of our events will have their schemas stored in [./schemas/events](./schemas/events). These schemas are used for validation and code generation. The schemas are written in yaml and follow the json schema spec. You can find out more about json schema at [https://json-schema.org/](https://json-schema.org/).

For each event, there will be a schema for the envelope (this is cloud events, and will reference the default NHS Notify cloudevent profile schema). And there will also be a schema for the data payload. The data payload schema will be referenced in the envelope schema.

## Starting a New Chat Session

**When starting a new chat session**, first check and clear **`src/HANDOVER.md`**:

1. **Check if HANDOVER.md has content from a previous session**:
   - If it contains handover information, read it to understand the previous session's state
   - **Archive it by appending to `src/HANDOVER_HISTORY.md`**:
     - Copy the entire contents of `src/HANDOVER.md`
     - Add a separator with timestamp: `---\n\n## Handover - YYYY-MM-DD HH:MM GMT\n\n` (use actual current UK time)
     - Paste the copied content below the separator
     - Insert at the TOP of the history (below the header, but above previous entries)

2. **Clear HANDOVER.md for the new session**:
   - Replace contents with a simple header: `# Current Session Handover\n\n*This file is only used when transitioning to a new chat session. During active work, use TESTING_PLAN.md for tracking progress.*`

3. **Use TESTING_PLAN.md for all session tracking**:
   - Check the "Current Actions and Todos" section for what's in progress
   - Add changelog entries as work progresses
   - Update progress tracker when completing tasks
   - This is the **primary** documentation for ongoing work

The detailed testing plan is in **`src/TESTING_PLAN.md`** with progress tracker and changelog.

## Handover to New Chat Session

**ONLY when told to "write a prompt for a new chat", "prepare for handover", or explicitly ending a session:**

1. **Append current HANDOVER.md to HANDOVER_HISTORY.md** (if it has content):
   - Copy the entire contents of `src/HANDOVER.md`
   - Add a separator with timestamp: `---\n\n## Handover - YYYY-MM-DD HH:MM GMT\n\n`. Ensure the real actual current time in UK timezone (GMT/BST) is used.
   - Paste the copied content below the separator
   - Insert at the TOP of the history (below the header, but above previous entries)

2. **Update `src/HANDOVER.md`** - Completely replace the file contents with handover snapshot:
   - What was just completed in this session
   - Immediate next tasks and priorities
   - Current context and state
   - Key commands and files to check
   - Any blockers or important decisions made
   - Reference to TESTING_PLAN.md for detailed progress

3. **Stage and commit all outstanding changes**:

   ```bash
   cd /workspaces/nhs-notify-digital-letters
   git add -A
   git status  # Review what's being committed
   git commit -m "docs: update HANDOVER.md for session continuity"
   ```

4. **Keep the prompt simple** - Just tell the user to check `src/HANDOVER.md`:
   - "Please check `src/HANDOVER.md` for the current status and next tasks."
   - Do NOT write a long prompt inline - all details go in the HANDOVER.md file

## Copilot Instructions for src/ Testing

**When working on testing implementation in the `src/` directory:**

1. **ALWAYS check current directory before path-specific commands** - Run `pwd` before executing any commands that depend on file paths or directory locations. Never assume you're in the repository root or any specific directory. Always know where you are.

1. **ALWAYS use absolute paths with cd command** - Never use relative paths like `cd src/project` or `cd ../..`. Always use absolute paths like `cd /workspaces/nhs-notify-digital-letters/src/project`. This prevents navigation errors when the current directory is uncertain.

1. **Check the "Current Actions and Todos" section in `../TESTING_PLAN.md` first** - This shows what's currently being worked on and what's next. When starting a new chat or continuing work, review this section to understand the current state and pick up where we left off.

1. **Always update the "Current Actions and Todos" section in `../TESTING_PLAN.md`** when starting new work, completing tasks, or encountering blockers. This section should always reflect the current state of work.

1. **Always update the Implementation Progress Tracker section in `../TESTING_PLAN.md`** when completing any implementation tasks

1. **Always add an entry to the Implementation Changelog section in `../TESTING_PLAN.md`** for each implementation activity - add new entries at the TOP in reverse chronological order with **date and time in UK timezone (YYYY-MM-DD HH:MM GMT/BST format)**, author, activity summary, changes made, files modified, and current status. **CRITICAL: Use the ACTUAL CURRENT time in GMT/BST - run `TZ='Europe/London' date` to get the correct UK timestamp in format like "Wed Nov 5 08:35:42 AM GMT 2025". Extract the time (HH:MM) and format as YYYY-MM-DD HH:MM GMT. Do not make up or guess timestamps.** **Include changelog entries for updates to the TESTING_PLAN.md document itself.**

1. **Use proper markdown code fence language specifiers** - never use just ` ``` `, always specify the language (e.g., ` ```bash `, ` ```python `, ` ```typescript `, ` ```makefile `, ` ```plain `)

1. **Ensure all internal links are valid** - test that section references work correctly in TESTING_PLAN.md

1. **Keep the TESTING_PLAN.md synchronized** with actual implementation state

1. **Update timestamps** in the document status section when making changes

1. **Follow the phased approach** - complete phases in order and track progress

1. **Mark checkboxes** (✅/❌) in the progress tracker as work is completed

1. **Add notes** to the progress tracker for any deviations or important decisions

1. **Run pre-commit hooks before committing** - Always stage modified files with `git add <files>`, then ensure you're in the repository root directory (`cd /workspaces/nhs-notify-digital-letters`), and run `git commit -m "message"` which will automatically trigger the pre-commit hooks. All hooks must pass successfully before the commit completes.

1. **Vale vocabulary exceptions** - If vale reports false positives for legitimate technical terms, you may add them to `scripts/config/vale/styles/config/vocabularies/words/accept.txt` (one word per line, alphabetically sorted). **IMPORTANT**: Always document any additions to accept.txt in the changelog with justification for why the word is legitimate.

1. **npm workspace test convention** - For projects with `package.json` that are part of the npm workspace (listed in root package.json workspaces), tests must be executable via `npm run test:unit`. The project's Makefile `test` target should call `npm run test:unit` to align with the workspace-wide test execution pattern (`npm run test:unit --workspaces`).

1. **Python environment setup** - For Python projects, always use `configure_python_environment` tool to set up the Python environment before running tests or installing dependencies. When VS Code prompts to select which requirements file to install, **always select `requirements-dev.txt`** (not `requirements.txt`) as it includes all testing dependencies plus production dependencies.

1. **Update unit.sh for CI/CD integration** - When adding tests for a new project, you **MUST** update `scripts/tests/unit.sh` to include:
    - Installation of prerequisites (e.g., `make -C ./src/project-name install-dev` for Python projects)
    - Execution of the test suite (e.g., `make -C ./src/project-name test`)
    - The CI/CD pipeline runs `make test-unit` which calls `scripts/tests/unit.sh`
    - This file is used by `.github/workflows/stage-2-test.yaml` in the "Run unit test suite" step
    - Always test that the prerequisites install correctly before running tests
    - Add a comment in unit.sh explaining what each section does

1. **Use GitHub CLI for monitoring CI/CD** - When monitoring GitHub Actions workflow runs:
    - **CRITICAL**: Always prefix `gh` commands with `GH_PAGER=cat` to disable the pager that requires pressing 'q' to exit
    - Use `GH_PAGER=cat gh run list --branch <branch-name> --limit <n> --json databaseId,status,conclusion,name,createdAt,url` to list recent workflow runs
    - Use `GH_PAGER=cat gh run view <run-id> --json conclusion,status,jobs` to view details of a specific run
    - **DO NOT use `gh run watch <run-id>`** - it's interactive and will block waiting for user input. Poll with `gh run view` instead
    - To monitor a run in progress, repeatedly call `GH_PAGER=cat gh run view <run-id> --json status,conclusion` every 30-60 seconds
    - If `gh` commands fail with "No default remote repository", run `gh repo set-default NHSDigital/nhs-notify-digital-letters`
    - If authentication is required, the user will handle `gh auth login`
    - **Examples**:
      - List runs: `GH_PAGER=cat gh run list --branch rossbugginsnhs/2025-11-04/eventcatalog-001 --limit 5 --json databaseId,status,conclusion,name,url`
      - View run: `GH_PAGER=cat gh run view <run-id> --json conclusion,status,jobs`
      - Check status: `GH_PAGER=cat gh run view <run-id> --json status,conclusion`
      - With jq: `GH_PAGER=cat gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion == "failure") | {name: .name, conclusion: .conclusion}'`

1. **Use SonarCloud API for coverage monitoring** - To check coverage metrics on branches:
    - **Public API (no auth required)**: `https://sonarcloud.io/api/measures/component`
    - **Parameters**:
      - `component`: `NHSDigital_nhs-notify-digital-letters` (project) or `NHSDigital_nhs-notify-digital-letters:src/project-name` (specific component)
      - `branch`: URL-encoded branch name (e.g., `rossbugginsnhs/2025-11-04/eventcatalog-001`)
      - `metricKeys`: `coverage,new_coverage,lines_to_cover,new_lines_to_cover`
    - **Example**: `curl -s "https://sonarcloud.io/api/measures/component?component=NHSDigital_nhs-notify-digital-letters:src/asyncapigenerator&branch=rossbugginsnhs/2025-11-04/eventcatalog-001&metricKeys=coverage,new_coverage,lines_to_cover,new_lines_to_cover" | python3 -m json.tool`
    - Use this to verify coverage is being detected after SonarCloud configuration changes
    - Look for `new_coverage` in the response - should not be 0.0% if tests are working

1. **CRITICAL: Python Coverage Configuration for SonarCloud** - **THIS HAS BEEN GOTTEN WRONG MULTIPLE TIMES - FOLLOW EXACTLY:**
    - **DO NOT create a separate `.coveragerc` file** - it causes path resolution issues
    - **Configuration must be in `pytest.ini`** in a `[coverage:run]` section
    - **MUST include `relative_files = True`** to convert absolute paths to relative paths
    - **Makefile `coverage` target MUST:**
      - Run from repo root: `cd ../.. && pytest ...`
      - Cover whole project directory: `--cov=src/projectname` (NOT subdirectory like `--cov=scripts`)
      - Reference pytest.ini: `--cov-config=src/projectname/pytest.ini`
      - Output to project directory: `--cov-report=xml:src/projectname/coverage.xml`
    - **Example working pattern** (from cloudeventjekylldocs):

      ```makefile
      coverage:
          @cd ../.. && pytest src/cloudeventjekylldocs/tests/ \
              --cov=src/cloudeventjekylldocs \
              --cov-config=src/cloudeventjekylldocs/pytest.ini \
              --cov-report=html:src/cloudeventjekylldocs/htmlcov \
              --cov-report=term-missing \
              --cov-report=xml:src/cloudeventjekylldocs/coverage.xml \
              --cov-branch
      ```

    - **pytest.ini must include**:

      ```ini
      [coverage:run]
      relative_files = True
      omit =
          */tests/*
          */test_*.py
          */__pycache__/*
          */venv/*
          */env/*
      ```

    - **Verification**: Check `coverage.xml` - filenames should be `src/projectname/file.py` or `subdir/file.py` NOT bare `file.py`
    - **If paths are wrong**: Check that you're covering the whole directory, not a subdirectory, and that `relative_files = True` is set
    - **Common mistakes to avoid**:
      - Creating `.coveragerc` file (conflicts with pytest.ini)
      - Not setting `relative_files = True`
      - Covering subdirectory instead of whole project
      - Running pytest from project directory instead of repo root
      - Not using `--cov-config` to point to pytest.ini

## Quick Reference

- **TESTING_PLAN.md**: Main testing plan document with progress tracker and changelog
- **TESTING_QUICK_REFERENCE.md**: Quick reference for testing patterns
- **Pre-commit hooks**: `bash scripts/githooks/pre-commit.sh` (run from repository root)
- **Coverage target**: 80%+ for all projects
- **Test command**: `make test` in each project directory
