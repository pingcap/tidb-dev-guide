# Cherry-pick a Pull Request

TiDB uses [release train model](../project-management/release-train-model.md) and has multiple releases. Each release matches one git branch. For `type/bug` issues with `severity/critical` and `severity/major`, it is anticipated to be fixed on any [currently maintained releases](https://pingcap.github.io/tidb-dev-guide/project-management/release-train-model.html#current-maintained-releases) if affected. Contributors and reviewers are responsible to settle the affected versions once the bug is identified as `severity/critical` or `severity/major`. Cherry-pick pull requests shall be created to port the fix to affected branches after the original pull request merged. While creating cherry-pick pull requests, bots in TiDB community could help lighten your workload.

## What kind of pull requests need to cherry-pick?

Because there are more and more releases of TiDB and limits of developer time, we are not going to cherry-pick every pull request. Currently, only problems with `severity/critical` and `severity/major` are candidates for cherry-pick. There problems shall be solved on all affected [maintained releases](https://pingcap.github.io/tidb-dev-guide/project-management/release-train-model.html#current-maintained-releases). Check [Issue Triage chapter](issue-triage.md) for severity identification.

## Create cherry-pick pull requests automatically

Typically, TiDB repos use ti-chi-bot to help contributors create cherry-pick pull requests automatically.

`ti-chi-bot` creates corresponding cherry-pick pull requests according to the `needs-cherry-pick-<release-branch-name>` on the original pull request once it's merged. If there is any failure or omission, contributors could run `/cherry-pick <release-branch-name>` to trigger cherry-pick for a specific release.

## Create cherry-pick pull requests manually

Contributors could also create cherry-pick pull requests manually if they want. [git cherry-pick](https://git-scm.com/docs/git-cherry-pick) is a good command for this. The requirements in [Contribute Code](contribute-code.md) also apply here.

## Pass triage complete check

For pull requests, `check-issue-triage-complete` checker will first check whether the [corresponding issue](https://pingcap.github.io/tidb-dev-guide/contribute-to-tidb/contribute-code.html#referring-to-an-issue) has any `type/xx` label, if not, the checker fails. Then for issues with `type/bug` label, there must also exist a `severity/xx` label, otherwise, the checker fails. For `type/bug` issue with `severity/critical` or `severity/major` label, the checker checks if there is any `may-affects-x.y` label, which means the issue has not been diagnosed on all needed versions. If there is, the pull request is blocked and not able to be merged. So in order to merge a bugfix pull request into the target branch, every other effective version needs to first be diagnosed. TiDB maintainer will add these labels.

ti-chi-bot will automatically trigger the checker to run on the associated PR by listening to the labeled/unlabeled event of `may-affects-x.y` labels on bug issues, contributors also could comment `/check-issue-triage-complete` or `/run-check-issue-triage-complete` like other checkers to rerun the checker manually and update the status. Once `check-issue-triage-complete` checker passes, ti-chi-bot will add `needs-cherry-pick-<release-version>`/`needs-cherry-pick-<release-branch-name>`  labels to pull requests according to the `affects-x.y` labels on the corresponding issues.

In addition, if the checker fails, the robot will add the `do-not-merge/needs-triage-completed` label to the pull request at the same time, which will be used by other plugins like [tars](https://book.prow.tidb.io/#/en/plugins/tars).


## Review cherry-pick pull requests

Cherry-pick pull requests obey the [same review rules](review-a-pr.md) as other pull requests. Besides the merge requirements as normal pull requests, cherry-pick pull requests are added `do-not-merge/cherry-pick-not-approved` label initially. To get it merged, it needs an additional `cherry-pick-approved` label from team *qa-release-merge*.

## Troubleshoot cherry-pick

* If there is any error in the cherry-pick process, for example, the bot fails to create some cherry-pick pull requests. You could ask reviewers/committers/maintainers for help.
* If there are conflicts in the cherry-pick pull requests. You must [resolve the conflicts](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/about-merge-conflicts) to get pull requests merged. Some ways to do this():
  - Request privileges to the forked repo by sending `/cherry-pick-invite` comment in the cherry-pick pull request if you are a member of the orgnization. When you accepted the invitaion, you could directly push to the pull request branch.
  - Ask committers/maintainers to do that for you if you are not a member of the orgnization.
  - Manually create a new cherry-pick pull request for the branch .
