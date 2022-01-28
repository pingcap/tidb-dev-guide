# Report an Issue

If you think you have found an issue in TiDB, you can report it to the [issue tracker](https://github.com/pingcap/tidb/issues). If you would to like to report issues to TiDB documents or this development guide, they are in separate GitHub repositories, so you need to file issues to corresponding issue tracker, [TiDB document issue tracker](https://github.com/pingcap/docs/issues) and [TiDB Development Guide issue tracker](https://github.com/pingcap/tidb-dev-guide/issues). Read [Write Document](write-document.md) for more details.

## Checking if an issue already exists

The first step before filing an issue report is to see whether the problem has already been reported. You can [use the search bar to search existing issues](https://docs.github.com/en/github/administering-a-repository/finding-information-in-a-repository/using-search-to-filter-issues-and-pull-requests). This doesn't always work, and sometimes it's hard to know what to search for, so consider this extra credit. We won't mind if you accidentally file a duplicate report. Don't blame yourself if your issue is closed as duplicated. We highly recommend if you are not sure about anything of your issue report, you can turn to [internal.tidb.io](https://internals.tidb.io) for a wider audience and ask for discussion or help.

## Filing an issue

If the problem you're reporting is not already in the issue tracker, you can [open a GitHub issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-an-issue) with your GitHub account. TiDB uses issue template for different kinds of issues. Issue templates are a bundle of questions to collect necessary information about the problem to make it easy for other contributors to participate. For example, a bug report issue template consists of four questions:

* Minimal reproduce step.
* What did you expect to see?
* What did you see instead?
* What is your TiDB version?

Answering these questions give the details about your problem so other contributors or TiDB users could pick up your issue more easily. 

As previous section shows, duplicated issues should be reduced. To help others who encountered the problem find your issue, except for problem details answered in the issue template, a descriptive title which contains information that might be unique to it also helps. This can be the components your issue belongs to or database features used in your issue, the conditions that trigger the bug, or part of the error message if there is any. 

## Making good issues

Except for a good title and detailed issue message, you can also add suitable labels to your issue via [/label](https://prow.tidb.io/command-help?repo=pingcap%2Ftidb#type), especially which component the issue belongs to and which versions the issue affects. Many committers and contributors only focus on certain subsystems of TiDB. Setting the appropriate component is important for getting their attention. Some issues might affect multiple releases. You can query [Issue Triage chapter](issue-triage.md) for more information about what need to do with such issues.

If you are able to, you should take more considerations on your issue:

* Does the feature fit well into TiDB's architecture? Will it scale and keep TiDB flexible for the future, or will the feature restrict TiDB in the future?
* Is the feature a significant new addition (rather than an improvement to an existing part)? If yes, will the community commit to maintaining this feature?
* Does this feature align well with currently ongoing efforts?
* Does the feature produce additional value for TiDB users or developers? Or does it introduce the risk of regression without adding relevant user or developer benefit?

Deep thoughts could help the issue proceed faster and help build your own reputation in the community.

## Understanding the issue's progress and status

Once your issue is created, other contributors might take part in. You need to discuss with them, provide more information they might want to know, address their comments to reach consensus and make the progress proceeds. But please realize there are always more pending issues than contributors are able to handle, and especially TiDB community is a global one, contributors reside all over the world and they might already be very busy with their own work and life. Please be patient! If your issue gets stale for some time, it's okay to ping other participants, or take it to [internal.tidb.io](https://internals.tidb.io) for more attention.

## Disagreement with a resolution on the issue tracker

As humans, we will have differences of opinions from time to time. First and foremost, please be respectful that care, thought, and volunteer time went into the resolution.

With this in mind, take some time to consider any comments made in association with the resolution of the issue. On reflection, the resolution steps may seem more reasonable than you initially thought.

If you still feel the resolution is incorrect, then raise a thoughtful question on [internal.tidb.io](https://internals.tidb.io). Further argument and disrespectful discourse on [internal.tidb.io](https://internals.tidb.io) after a consensus has been reached amongst the committers is unlikely to win any converts.

## Reporting security vulnerabilities 

Security issues are not suitable to report in public early, so different tracker strategy is used. Please refer to the [dedicated process](https://github.com/pingcap/tidb/security/policy).
