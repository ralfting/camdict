# 1. Implement GitHub releases flow

Status: Accepted | Author: Ralph Effting | Date: 2026-11-13

## Problem

A camdict user who uses the CLI cannot follow new features and fixes in the
tool. They don't know what was added or whether a bug was fixed. The only
place to find this is the commit history, which mixes features, fixes and
refactors and focuses on implementation details:

    9180afa (tag: v2.1.0) Bump: 2.0.1 to 2.1.0
    582b678 Merge pull request #10 from ralfting/feature/did-you-mean
    c8b79a3 Move spelling suggestions into their own module
    1badbc0 Rank close spellings by how common they are
    580be03 Document spelling suggestions and the Datamuse source
    cfdf36b Suggest spellings when a word is not found

This makes it hard to see what shipped and in which version. Users have no
way to group changes by git tag.

## Constraints

- Notes appear on the GitHub Releases page.
- Notes show only what changes for the user, never implementation details.
- Not every PR creates a release. One release can group several PRs.
- A release starts manually, from a button in GitHub Actions.

## Options

| Option | Cost per PR | Cost per release | One-time cost | Risk |
|---|---|---|---|---|
| A. `npm version` + GitHub's generated notes, edited at release time | Write a PR title that describes the change | Separate what goes to users from what does not | Shared | Forgetting the cleanup leaks implementation details into the notes |
| B. [Changesets](https://github.com/changesets/changesets) | Write a note in `.changeset/` in every PR that changes something for users | Review the ready text and press the button | Shared, plus set up changesets | Forgetting to write the note in the PR |

One-time cost shared by both: CI with tests, OIDC identity on npm and a release workflow.

## Decision

We choose GitHub Releases with `npm version` in CI, for simplicity, because
the project has one developer today, who also owns the release. We accept the
cost of cleaning GitHub's generated notes by hand.

## Out of scope

- A fully automated flow.
- Automatic cleanup of the notes.
- Notes for versions already released. The history starts with the next version.

## Plan

1. CI that runs `npm test` on every PR.
2. Register GitHub Actions as a trusted publisher on npm (OIDC).
3. A workflow with a button that runs `npm version` and publishes to npm.
4. Generate the notes on the Releases page and remove internal details.

## How to undo

Remove the publish workflow. The tests stay, because they don't depend on the release.

## When to revisit

When the project has two contributors.
