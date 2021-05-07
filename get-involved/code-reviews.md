# Code Reviews

This guide is for all contributors that want to help with reviewing code contributions. Thank you for your effort - good reviews are one of the most important and crucial parts of an open source project. This guide should help the community to make reviews such that:

- Contributors have a good contribution experience.
- Our reviews check all important aspects of a contribution.
- We make sure to keep a high code quality in TiDB.
- We avoid situations where contributors and reviewers spend a lot of time refining a contribution that gets rejected later.

Every review needs to check the following six aspects. We encourage to check these aspects in order, to avoid spending time on detailed code quality reviews when formal requirements are not met or there is no consensus in the community to accept the change.

## 1. Is the Contribution Well-Described?

Check whether the contribution is sufficiently well-described to support a good review. Trivial changes and fixes do not need a long description. If the implementation is exactly according to a prior discussion on an issue or [developer discussion forum](https://internals.tidb.io/), only a short reference to that discussion is needed. If the implementation is different from the agreed approach in the consensus discussion, a detailed description of the implementation is required for any further review of the contribution.

Any pull request that changes functionality or behavior needs to describe the big picture of these changes, so that reviews know what to look for (and don't have to dig through the code to hopefully understand what the change does).

A contribution is well-described if the following questions 2, 3, and 4 can be answered without looking at the code.

## 2. Is There Consensus that the Change or Feature Should Go into TiDB?

This question can be directly answered from the linked GitHub issue. For pull requests that are created without prior consensus, a discussion in issue or developer discussion forum to seek consensus will be needed.

For trivial pull requests, consensus needs to be checked in the pull request.

## 3. Does the Contribution Need Attention from some Specific Members?

Some changes require attention and approval from specific members. For example, changes in parts that are either very performance sensitive, or have a critical impact on consistency need input by a member that is deeply familiar with the component.

## 4. Does the Implementation Follow the Agreed Upon Overall Approach/Architecture?

In this step, we check if a contribution follows the agreed upon approach from the previous discussion in issue or developer discussion forum.

This question should be answerable from the Pull Request description or the linked discussion as much as possible.

We recommend to check this before diving into the details of commenting on individual parts of the change.

## 5. Is the Overall Code Quality Good, Meeting Standard We Want to Maintain in TiDB?

This is the detailed code review of the actual changes, covering:

- Are the changes doing what is described in the discussion or design document?
- Does the code follow the right software engineering practices? Is the code correct, robust, maintainable, testable?
- Are the changes performance aware, when changing a performance sensitive part?
- Are the changes sufficiently covered by tests?
- Are the tests executing fast, i.e., are heavy-weight integration tests only used when necessary?
- Does the code obey Golang linters enabled in TiDB?
