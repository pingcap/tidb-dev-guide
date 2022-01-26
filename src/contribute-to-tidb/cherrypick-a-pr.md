# Cherry-pick a Pull Request

TiDB uses [release train model](../project-management/release-train-model.md) and has multiple releases. Each release matches one git branch. For `type/bug` issues with `severity/critical` and `severity/major`, it is anticipated to be fixed on any [currently maintained releases](https://pingcap.github.io/tidb-dev-guide/project-management/release-train-model.html#what-is-tidb-version-mechanism-under-release-train-model) if affected. Contributors and reviewers are responsible to settle the affected versions once the bug is identified as `severity/critical` or `severity/major`.

## Triage on Bug Issue

For `type/bug` issues, when they are created and identified as `severity/critical` or `severity/major`, the ti-chi-bot will assign a list of `may-affect-x.y` labels to the issue. For example, currently if we have version 5.0, 5.1, 5.2, 5.3, 4.0 and the in-sprint 5.4, when a `type/bug` issue is created and added label `severity/critical` or `severity/major`, the ti-chi-bot will add label `may-affect-4.0`, `may-affect-5.0`, `may-affect-5.1`, `may-affect-5.2`, and `may-affect-5.3`. These labels mean that whether the bug affects these release versions are not yet determined, and is awaiting being triaged.

When a version is triaged, the triager needs to remove the corresponding `may-affect-x.y` label. If the version is affected, the triager needs to add a corresponding `affects-x.y` label to the issue and in the meanwhile the `may-affect-x.y` label can be automatically removed by the ti-chi-bot, otherwise the triager can simply remove the `may-affect-x.y` label. So when a issue has a label `may-affect-x.y`, this means the issue has not been diagnosed on version x.y. When a issue has a label `affects-x.y`, this means the issue has been diagnosed on version x.y and identified affected. When both the two labels are missing, this means the issue has been diagnosed on version x.y but the version is not affected.

The status of the affection of a certain issue can be then determined by the combination of the existence of the corresponding `may-affect-x.y` and `affect-x.y` labels on the issue, see the table bellow for a clearer illustration.

| may-affect-x.y | affects-x.y |                         status                                |
|:--------------:|:-----------:|:-------------------------------------------------------------:|
|     YES        |    NO       | version x.y has not been diagnosed                            |
|     NO         |    NO       | version x.y has been diagnosed and identified as not affected |
|     NO         |    YES      | version x.y has been diagnosed and identified as affected     |
|     YES        |    YES      | invalid status                                                |

## Pass Triage Complete Check

For pull requests, `check-issue-triage-complete` checker will first check whether the [corresponding issue](https://pingcap.github.io/tidb-dev-guide/contribute-to-tidb/contribute-code.html#referring-to-an-issue) has any `type/xx` label, if not, the checker fails. Then for issues with `type/bug` label, there must also exist a `severity/xx` label, otherwise, the checker fails. For `type/bug` issue with `severity/critical` or `severity/major` label, the checker checks if there is any `may-affect-x.y` label, which means the issue has not been diagnosed on all needed versions. If there is, the pull request is blocked and not able to be merged. So in order to merge a bugfix pull request into the target branch, every other effective version needs to first be diagnosed.

The bot will automatically trigger the checker to run on the associated PR by listening to the labeled / unlabeled event of `may-affects-x.y` labels on bug issue, contributors also could comment `/run-check-issue-triage-complete` like other checkers to rerun the checker manually and update the status. In addition, if the checker fails, the robot will add the `do-not-merge/needs-triage-completed` label to the PR at the same time, which will be used by other plugins like [tars](https://book.prow.tidb.io/#/en/plugins/tars).

## Create Cherry-pick Pull Requests

ti-chi-bot will add `needs-cherry-pick-x.y` labels to pull requests according to the `affects-x.y` labels on the corresponding issues when the `check-issue-triage-complete` checker passes. Then ti-srebot will automatically create cherry-pick pull requests according to the `needs-cherry-pick-x.y` labels for you. The cherry-pick pull requests will be created even if it conflicts with the target branch. You need to manually resolve the conflicts.

Besides the merge requirements as normal pull requests, cherry-pick pull requests are added `do-not-merge/cherry-pick-not-approved` label initially. To get it merged, it needs an additional `cherry-pick-approved` label.
