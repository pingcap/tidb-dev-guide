# Contribute Code

TiDB is maintained, improved, and extended by code contributions. We welcome contributions to TiDB, but due to the size of the project and to preserve the high quality of the code base, we follow a contribution process that is explained in this document.

**Please feel free to ask questions at any time.** Either create a topic on the [developer discussion forum](http://internals.tidb.io/) or comment on the GitHub issue you are working on.

Please read this document carefully before starting to work on a code contribution. Follow the process and guidelines explained below. Contributing to TiDB does _not_ start with opening a pull request. We expect contributors to reach out to us first to discuss the overall approach together. Without consensus with the TiDB committers, contributions might require substantial rework or will not be reviewed.

## Looking for what to contribute

If you have a good idea for the contribution, you can proceed to the code contribution process. If you are looking for what you could contribute, you can browse open [GitHub issues](https://github.com/pingcap/tidb/issues) of TiDB, which are not assigned, and then follow the code contribution process. If you are very new to the TiDB project and want to learn about it and its contribution process, you can check the [starter issues](https://github.com/pingcap/tidb/issues?q=is%3Aopen+is%3Aissue+label%3Agood-first-issue), which are annotated with a good-first-issue label.

## Code Contribution Process

### TL;DR

1. Discuss. Create a GitHub issue or create a topic on the [developer discussion forum](http://internals.tidb.io) and reach consensus.
2. Implement. Implement the change according to the approach agreed upon in the discussion.
3. Review. Open a pull request and work with the reviewer.
4. Merge. A committer of TiDB checks if the contribution fulfills the requirements and merges the code to the codebase.

### 1. Create GitHub Issue and Reach Consensus

The first step for making a contribution to TiDB is to reach consensus with the community. This means agreeing on the scope and implementation approach of a change.

In most cases, the discussion should happen on [GitHub issues](https://github.com/pingcap/tidb/issues).

The following types of changes requires a dedicated topic on the [developer discussion forum](http://internals.tidb.io/):

* big changes (major new feature; big refactors, involving multiple components)
* potentially controversial changes or issues
* changes with very unclear approaches or multiple equal approaches

Do not open a GitHub issue for these types of changes before the discussion has come to a conclusion. GitHub issue based on a forum discussion need to link to that discussion and should summarize the outcome.

Requirements for a GitHub issue to get consensus:

* Formal requirements
    * The _title_ describes the problem concisely.
    * The _description_ gives all the details needed to understand the problem or feature request.
    * The _component label_ is set. Many committers and contributors only focus on certain subsystems of TiDB. Setting the appropriate component is important for getting their attention.
* There is **agreement** that the issue solves a valid problem, and that it is a good fit for TiDB. The community considers the following aspects:
    * Does the contribution alter the behavior of features or components in a way that it may break previous users’ programs and setups? If yes, there needs to be a discussion and agreement that this change is desirable.
    * Does the contribution conceptually fit well into TiDB? Is it too much of a special case such that it makes things more complicated for the common case, or bloats the abstractions / APIs?
    * Does the feature fit well into TiDB's architecture? Will it scale and keep TiDB flexible for the future, or will the feature restrict TiDB in the future?
    * Is the feature a significant new addition (rather than an improvement to an existing part)? If yes, will the community commit to maintaining this feature?
    * Does this feature align well with currently ongoing efforts?
    * Does the feature produce added value for TiDB users or developers? Or does it introduce the risk of regression without adding relevant user or developer benefit?
* There is **consensus** on how to solve the problem. This includes considerations such as
    * API and data backwards compatibility and migration strategies
    * Testing strategies
    * Impact on TiDB's build time
    * Dependencies and their licenses

If a change is identified as a large or controversial change in the discussion on GitHub issue, it might require a [TiDB Design Document](make-proposal.md) or a discussion on the developer discussion forum to reach agreement and consensus.

Contributors can expect to get a first reaction from a committer within a few days after opening the issue. If an issue doesn’t get any attention, we recommend reaching out to the developer discussion forum. Note that the community sometimes does not have the capacity to accept all incoming contributions.

Once all requirements for the issue are met, one could assign somebody to the issue to work on it.

### 2. Implement your change

Once you've been assigned to a GitHub issue, you may start to implement the required changes.

Here are some further points to keep in mind while implementing:

* Set up a TiDB development environment.
* Follow the [Code Style and Quality Guide](code-style-and-quality-guide.md) of TiDB.
* Take any discussions and requirements from the GitHub issue or design document into account.
* Do not mix unrelated issues into one contribution.

### 3. Open a Pull Request

Considerations before opening a pull request:

* Make sure that `make test` is passing on your changes to ensure that all checks pass, the code builds and that all tests pass.
* Make sure your commit history adheres to the requirements.
* Make sure your change is up to date with the base branch.

Code changes in TiDB are reviewed and accepted through [GitHub pull requests](https://help.github.com/en/articles/creating-a-pull-request).

GitHub will auto assign reviewers to the pull requests, but you can also request reviews by commenting `/cc @reviewer`.

There is a separate guide on [how to review a pull request](review-a-pr.md), including our pull request review process. As a code author, you should prepare your pull request to meet all requirements.

### 4. Merge change

The code will be merged by a committer of TiDB once the review is finished. The related GitHub issue will be closed afterwards.
