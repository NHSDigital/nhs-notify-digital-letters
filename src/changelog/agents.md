# Agent Collaboration Guidelines for Feature Development

**Date**: 2025-11-13 15:16 GMT
**Purpose**: Standard process for agent-driven feature development with human oversight

## Overview

This document outlines the collaborative process between AI agents and humans for implementing new features or changes in this repository. The approach emphasizes:

- **Test-Driven Development (TDD)** - Tests first, then implementation
- **Agile Delivery** - Small, incremental PRs that add value
- **Human Oversight** - Checkpoints for validation and approval
- **Safety First** - Never break existing functionality

## The Process

### Naming Convention

**Folder Structure**: `/src/changelog/YYYY-MM-DD/NNN-NN-type-feature-name.md`

- **YYYY-MM-DD**: Date you start working on the feature
- **NNN**: Feature number for that day (001 for first feature, 002 for second, etc.)
- **NN**: Document number within that feature (00 for README, 01 for request, 02 for plan, etc.)
- **type**: Document type (readme, request, plan, requirements, testing-strategy, implementation-tracker, signoff)
- **feature-name**: Brief descriptive name

**Examples**:

- `/src/changelog/2025-11-13/001-00-readme-schema-validation.md` - First feature of the day, README
- `/src/changelog/2025-11-13/001-01-request-schema-validation.md` - First feature, request doc
- `/src/changelog/2025-11-13/001-06-signoff-schema-validation.md` - First feature, signoff doc (after completion)
- `/src/changelog/2025-11-13/002-00-readme-api-endpoint.md` - Second feature of the day, README
- `/src/changelog/2025-11-14/001-00-readme-new-feature.md` - New day, back to 001

**Document Numbers**:

- 00: README (user-facing documentation)
- 01: Request (what the human asked for)
- 02: Plan (implementation approach)
- 03: Requirements (functional and non-functional requirements)
- 04: Testing Strategy (test plan and TDD approach)
- 05: Implementation Tracker (progress tracking, continuously updated)
- 06: Signoff (completion verification, created at end)

**How to Determine Feature Number**:

1. Check what folders exist under today's date in `/src/changelog/YYYY-MM-DD/`
2. Look for the highest NNN prefix used
3. If starting first feature of the day, use 001
4. If other features exist (001, 002), use next number (003)

### Phase 1: Discovery and Planning

#### Step 1: Create Request Document (NNN-01-request-*.md)

**Agent Actions**:

- **First**: Determine feature number by checking existing files in today's changelog folder
- Create a concise request document summarizing what the human asked for
- Include date, branch name, and context
- Describe the problem or need
- Outline the proposed solution approach
- Use naming: `NNN-01-request-feature-name.md` where NNN is the feature number for today

**Human Actions**:

- Review and confirm understanding is correct
- Provide clarification if needed
- Approve to proceed

**PR Strategy**: Not needed yet - planning documents can accumulate.

---

#### Step 1.5: Create User-Facing README (NNN-00-readme-*.md)

**Agent Actions**:

- Create a clear, concise README for the new feature
- Focus on WHAT it does and HOW to use it (not how it was built)
- Include:
  - Feature overview and purpose
  - Quick start / usage examples
  - Command reference
  - Common use cases
  - Troubleshooting tips (can be minimal initially)
- Use simple language, avoid implementation details
- This file will be updated as the feature evolves

**Human Actions**:

- Review for clarity and completeness
- Ensure it's approachable for users
- Approve to proceed

**PR Strategy**: Include in first documentation PR - this is user-facing value.

**Note**: The README is numbered `00` to appear first when browsing, as it's the entry point for users. The other numbered files (01, 02, 03, etc.) are for development process tracking.

---

#### Step 2: Create Implementation Plan (NNN-02-plan-*.md)

**Agent Actions**:

- Break down the work into logical implementation steps
- Identify files that will be created or modified
- Outline integration points with existing code
- Define success criteria

**Human Actions**:

- Review plan for completeness and feasibility
- Suggest adjustments to approach
- Approve to proceed

**PR Strategy**: Not needed yet - still planning phase.

---

#### Step 3: Define Requirements (NNN-03-requirements-*.md)

**Agent Actions**:

- Document functional requirements (FRs) with acceptance criteria
- Document non-functional requirements (NFRs) - performance, reliability, maintainability
- List constraints, dependencies, and success metrics
- Ensure requirements are testable

**Human Actions**:

- Validate requirements align with needs
- Add missing requirements
- Approve to proceed

**PR Strategy**: ✅ **First PR Opportunity** - Documentation PRs are safe and add value:

- PR Title: `docs: Add planning documentation for [feature name]`
- PR Body: Link to request document, explain the feature
- Value: Establishes shared understanding, helps future contributors
- Risk: Zero - no code changes
- Review Effort: Low - just documentation

---

#### Step 4: Create Testing Strategy (NNN-04-testing-strategy-*.md)

**Agent Actions**:

- Define comprehensive test suites with specific test cases
- Specify skeleton implementations that will be created
- Document TDD approach (RED → GREEN → REFACTOR)
- Include test commands and coverage targets
- **IMPORTANT**: Make clear that implementation does NOT start until human approves failed tests

**Human Actions**:

- Review test coverage for completeness
- Ensure edge cases are covered
- Verify TDD approach is sound
- Approve to proceed

**PR Strategy**: ✅ **Second PR Opportunity** - Add testing strategy documentation:

- PR Title: `docs: Add testing strategy for [feature name]`
- Builds on first PR
- Value: Clear test plan, prevents rework
- Risk: Zero - still no code changes

---

#### Step 5: Create Implementation Tracker (NNN-05-implementation-tracker-*.md)

**Agent Actions**:

- Create checklist of all implementation tasks
- Break work into phases (Setup, Implementation, Integration, Documentation)
- Include progress tracking with status indicators (⏳ TODO, 🔄 IN PROGRESS, ✅ DONE)
- Add detailed progress log with timestamps
- **Note**: This file will be updated continuously throughout implementation

**Human Actions**:

- Review task breakdown
- Approve overall approach
- Give green light to start Phase 1 (Setup/RED)

**PR Strategy**: Could combine with previous docs PR or separate.

---

#### Step 5.5: Create Signoff Document (NNN-06-signoff-*.md)

**Agent Actions**:

- Create a comprehensive signoff document once implementation is complete
- Document how each requirement from 001-03-requirements.md was met
- List all tests created and their coverage
- Show validation results (all tests passing)
- Include integration verification (Make targets, npm scripts, CLI working)
- Document any deviations from original plan with justifications
- Provide evidence that success criteria are met
- Include performance metrics if applicable
- List any known limitations or future improvements

**Human Actions**:

- Review signoff document
- Verify all requirements are satisfied
- Confirm evidence is sufficient
- Sign off on feature completion
- Approve for final PR or merge

**PR Strategy**: Include in final documentation PR or create separate completion PR.

**When to Create**: After all implementation phases complete (GREEN, Integration, CI/CD, Documentation).

---

### Phase 2: TDD Setup (RED)

#### Step 6: Create Skeleton Implementations

**Agent Actions**:

- Add type definitions (interfaces, types)
- Add stub functions that throw "Not implemented" errors
- Create skeleton CLI scripts if needed
- **DO NOT implement any logic yet**

**Human Actions**:

- Quick review that stubs are in the right places
- Approve to proceed to test creation

**PR Strategy**: Not recommended - incomplete without tests.

---

#### Step 7: Create Comprehensive Test Files

**Agent Actions**:

- Create all test files as defined in testing strategy
- Write every test case with proper assertions
- Import skeleton implementations
- Ensure tests are executable
- **DO NOT run tests yet without human approval**

**Human Actions**:

- Review test files for completeness
- Check test assertions match requirements
- Approve to run tests

**PR Strategy**: Not recommended - tests will fail, might confuse reviewers.

---

#### Step 8: Run Tests and Verify All Fail

**Agent Actions**:

- Run test suite
- Verify all tests fail with "Not implemented" error
- Update implementation tracker with test results
- **STOP HERE - Wait for human approval before implementing**

**Human Actions**:

- Review test output
- Confirm all tests fail as expected
- Verify test infrastructure works (coverage, runner)
- **CRITICAL CHECKPOINT**: Approve to proceed with implementation

**PR Strategy**: ✅ **Third PR Opportunity** - TDD infrastructure PR:

- PR Title: `test: Add test suite for [feature name] (RED phase)`
- Include skeleton implementations + tests
- All tests should fail with "Not implemented"
- Value: Test infrastructure in place, clear definition of "done"
- Risk: Very low - no logic implemented, tests are isolated
- Review Effort: Medium - reviewers can see what's being tested
- **CI/CD**: Tests should run but be expected to fail
- **Note**: May need to mark tests as `.skip()` or adjust CI to allow failing tests on this branch

---

### Phase 3: Implementation (GREEN)

#### Step 9: Implement Core Logic

**Agent Actions**:

- Implement validation/core functions
- Run tests iteratively
- Implement just enough to pass each test
- Update tracker as tasks complete
- Add JSDoc comments

**Human Actions**:

- Monitor progress via tracker updates
- Can request intermediate reviews

**PR Strategy**: Not recommended mid-implementation - wait for completion.

---

#### Step 10: Verify All Tests Pass

**Agent Actions**:

- Run full test suite
- Verify 100% pass rate
- Check code coverage meets targets
- Update tracker to show GREEN phase complete

**Human Actions**:

- Review test results
- Approve to proceed with integration

**PR Strategy**: ✅ **Fourth PR Opportunity** - Core implementation PR:

- PR Title: `feat: Implement [feature name] core logic`
- Include implementation + passing tests
- Value: Core functionality working and tested
- Risk: Low - well-tested, isolated from other code
- Review Effort: Medium-High - reviewers see implementation
- **Should not break existing functionality** - feature is not yet integrated

---

### Phase 4: Integration and Documentation

#### Step 11: Integration with Existing Tools

**Agent Actions**:

- Update package.json scripts
- Update Makefile targets
- Add command-line interfaces
- Test integration points
- Validate against real data if applicable

**Human Actions**:

- Test integrated functionality
- Verify commands work as expected

**PR Strategy**: ✅ **Fifth PR Opportunity** - Integration PR:

- PR Title: `feat: Integrate [feature name] into build/CI tooling`
- Includes make targets, npm scripts, CLI
- Value: Feature is now usable by developers
- Risk: Low-Medium - changes build scripts but is additive
- Review Effort: Low - mostly configuration

---

#### Step 12: CI/CD Integration

**Agent Actions**:

- Add validation to CI/CD pipeline
- Update GitHub Actions workflows
- Test in CI environment
- Update documentation

**Human Actions**:

- Review CI changes
- Test pipeline execution

**PR Strategy**: ✅ **Sixth PR Opportunity** - CI/CD PR:

- PR Title: `ci: Add [feature name] validation to pipeline`
- Includes workflow updates
- Value: Automated validation, prevents future issues
- Risk: Medium - affects CI/CD, but can be initially non-blocking
- Review Effort: Low-Medium

**Note**: Consider making validation non-blocking initially (warning only), then blocking in a follow-up PR.

---

#### Step 13: Documentation and Examples

**Agent Actions**:

- Update README files
- Add usage examples
- Document new commands
- Update relevant guides

**Human Actions**:

- Review documentation
- Test examples work
- Final approval

**PR Strategy**: ✅ **Seventh PR Opportunity** - Documentation PR:

- PR Title: `docs: Add documentation for [feature name]`
- Can be combined with CI/CD PR
- Value: Users can discover and use feature
- Risk: Zero - documentation only
- Review Effort: Low

---

### Phase 5: Refinement (REFACTOR)

#### Step 14: Code Quality and Optimization

**Agent Actions**:

- Refactor for clarity
- Optimize performance if needed
- Ensure consistent style
- Run all tests to ensure green

**Human Actions**:

- Review refactoring
- Approve final version

**PR Strategy**: Optional - Can be part of implementation PR or separate cleanup PR.

---

## PR Strategy Summary

### Recommended PR Sequence

1. **Planning Docs PR** - All 001-0X documents (request, plan, requirements, testing, tracker)
2. **TDD Infrastructure PR** - Skeleton implementations + failing tests
3. **Core Implementation PR** - Working implementation + passing tests
4. **Integration PR** - Make targets, npm scripts, CLI tools
5. **CI/CD PR** - Pipeline integration (start non-blocking)
6. **Documentation PR** - User-facing docs and examples
7. **Optional Refinement PR** - Code quality improvements

### PR Best Practices

**Size Guidelines**:

- Target: 200-400 lines of changes per PR
- Maximum: 600 lines (unless unavoidable)
- If larger, split into logical chunks

**Value Guidelines**:

- Every PR should add standalone value
- Even incomplete features can be merged if they don't break things
- Use feature flags or conditional logic to hide incomplete work

**Safety Guidelines**:

- Never break existing functionality
- All tests must pass (except TDD infrastructure PR where we expect failures)
- Run pre-commit hooks before every PR
- Verify CI passes before requesting review

**Review Guidelines**:

- Write clear PR descriptions
- Link to planning documents
- Highlight areas needing special attention
- Include testing instructions

---

## Checkpoints Where Agent Must Stop and Wait

### CRITICAL CHECKPOINTS - Agent MUST NOT Proceed Without Human Approval

1. **After creating planning documents** - Human must approve approach
2. **After creating test strategy** - Human must approve test plan
3. **After running tests (RED phase)** - Human must verify all tests fail correctly
4. **Before each PR** - Human must review and approve PR content
5. **After core implementation** - Human must approve before integration
6. **After CI/CD changes** - Human must verify pipeline works

### OPTIONAL CHECKPOINTS - Agent Should Offer Human the Option

1. During long implementations - offer progress updates
2. When encountering unexpected issues - ask for guidance
3. When multiple approaches are possible - ask for preference

---

## Agent Communication Guidelines

### When Starting Each Phase

- State clearly which phase you're starting
- Reference the relevant planning document
- List what you're about to create/modify
- Wait for human confirmation if it's a critical checkpoint

### When Completing Each Phase

- Update the implementation tracker with status and timestamp
- Summarize what was accomplished
- Note any deviations from plan
- Suggest next steps or PR opportunities

### When Suggesting a PR

- Clearly state: "This is a good point for a PR"
- Explain what value the PR adds
- Describe what risks it has (should be low)
- Estimate review effort
- Wait for human approval to prepare PR

### When Encountering Issues

- Stop immediately
- Describe the issue clearly
- Propose 2-3 potential solutions
- Ask human for decision
- Update tracker with blocker status

---

## Version Control Best Practices

### Branch Naming

- Use pattern: `username/YYYY-MM-DD/feature-brief-name`
- Example: `rossbugginsnhs/2025-11-13/schema-restrictions`

### Commit Messages

- Follow conventional commits format
- Examples:
  - `docs: Add planning documentation for schema validation`
  - `test: Add test suite for dataschema consistency (RED phase)`
  - `feat: Implement dataschema consistency validation`
  - `ci: Add dataschema validation to pipeline`

### Commit Frequency

- Commit after each significant step
- Don't wait to accumulate many changes
- Commits should be logical units of work
- Agent should commit and push regularly

---

## Success Criteria

A feature implementation is complete when:

- ✅ All tests pass with 100% coverage target met
- ✅ Integration with existing tools is working
- ✅ CI/CD pipeline includes validation
- ✅ Documentation is updated
- ✅ All PRs are merged to main
- ✅ Implementation tracker shows all tasks complete
- ✅ No existing functionality is broken

---

## Anti-Patterns to Avoid

### ❌ Big Bang Implementation

- Don't implement everything in one massive PR
- Break work into incremental, reviewable chunks

### ❌ Premature Implementation

- Don't start coding before tests are approved
- Don't skip the RED phase of TDD

### ❌ Hidden Work

- Don't implement features that can't be merged
- If feature isn't ready, use feature flags, don't keep in long-lived branch

### ❌ Breaking Changes Without Discussion

- Never break existing APIs or behavior without human approval
- Discuss breaking changes in planning phase

### ❌ Skipping Documentation

- Don't merge features without updating docs
- Documentation is part of the feature, not an afterthought

---

## Template Checklist for Agent

For each new feature request, agent should:

- [ ] **Determine feature number**: Check `/src/changelog/YYYY-MM-DD/` for highest NNN prefix, use next number
- [ ] Create request document (NNN-01)
- [ ] Create user-facing README (NNN-00)
- [ ] Create plan document (NNN-02)
- [ ] Create requirements document (NNN-03)
- [ ] Create testing strategy (NNN-04)
- [ ] Create implementation tracker (NNN-05)
- [ ] **CHECKPOINT**: Get human approval for planning
- [ ] **PR #1**: Planning documentation (including README)
- [ ] Create skeleton implementations
- [ ] Create test files
- [ ] **CHECKPOINT**: Get human approval to run tests
- [ ] Run tests and verify all fail
- [ ] Update tracker with RED phase results
- [ ] **CHECKPOINT**: Get human approval to implement
- [ ] **PR #2**: TDD infrastructure (skeletons + failing tests)
- [ ] Implement core logic
- [ ] Verify all tests pass
- [ ] Update tracker with GREEN phase results
- [ ] **PR #3**: Core implementation (working code + passing tests)
- [ ] Integrate with build tools
- [ ] **PR #4**: Integration (make/npm scripts)
- [ ] Integrate with CI/CD
- [ ] **PR #5**: CI/CD pipeline changes
- [ ] Update documentation
- [ ] **PR #6**: Documentation and examples
- [ ] Final verification and cleanup
- [ ] Update tracker to show complete

---

## Notes for Humans

### When to Intervene

- Agent is implementing before tests are approved
- PRs are getting too large (>600 lines)
- Agent is making breaking changes
- Tests are not comprehensive enough
- Implementation deviates from approved plan

### How to Give Feedback

- Be specific about what needs to change
- Reference the planning documents
- Explain the "why" behind requested changes
- Approve explicitly when ready to proceed

### Trust but Verify

- Agent will follow this process diligently
- Human oversight is still essential
- Review tracker regularly to monitor progress
- Test integrated functionality yourself

---

## Continuous Improvement

This document should evolve based on experience:

- Add lessons learned from each feature
- Refine PR strategy based on what works
- Update checkpoints based on where issues occur
- Improve templates based on feedback
