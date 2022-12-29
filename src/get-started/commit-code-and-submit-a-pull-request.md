# Commit the code and submit a pull request

The TiDB project uses [Git](https://git-scm.com/) to manage its source code. To contribute to the project, you need to get familiar with Git features so that your changes can be incorporated into the codebase.

This section addresses some of the most common questions and problems that new contributors might face. This section also covers some Git basics; however if you find that the content is a little difficult to understand, we recommend that you first read the following introductions to Git:

* The "Beginner" and "Getting Started" sections of [this tutorial](https://www.atlassian.com/git/tutorials) from Atlassian
* [Documentation](https://docs.github.com/en/github/getting-started-with-github/set-up-git) and [guides](https://guides.github.com/introduction/git-handbook/) for beginners from Github
* A more in-depth [book](https://git-scm.com/book/en/v2/) from Git

## Prerequisites

Before you create a pull request, make sure that you've installed Git, forked [pingcap/tidb](https://github.com/pingcap/tidb), and cloned the upstream repo to your PC. The following instructions use the command line interface to interact with Git; there are also several GUIs and IDE integrations that can interact with Git too.

If you've cloned the upstream repo, you can reference it using `origin` in your local repo. Next, you need to set up a remote for the repo your forked using the following command:

```bash
git remote add dev https://github.com/your_github_id/tidb.git
```

You can check the remote setting using the following command:

```bash
git remote -v
# dev    https://github.com/username/tidb.git (fetch)
# dev    https://github.com/username/tidb.git (push)
# origin    https://github.com/pingcap/tidb.git (fetch)
# origin    https://github.com/pingcap/tidb.git (push)
```

## Standard Process

The following is a normal procedure that you're likely to use for the most common minor changes and PRs:

1. Ensure that you're making your changes on top of master and get the latest changes:

   ```bash
   git checkout master
   git pull master
   ```

2. Create a new branch for your changes:

   ```bash
   git checkout -b my-changes
   ```

3. Make some changes to the repo and test them.

If the repo is buiding with [Bazel](https://bazel.build/) tool, you should update the bazel files(*.bazel, DEPS.bzl) also.

4. Commit your changes and push them to your `dev` remote repository:

   ```bash
   # stage files you created/changed/deleted
   git add path/to/changed/file.go path/to/another/changed/file.go

   # commit changes staged, make sure the commit message is meaningful and readable
   git commit -s -m "pkg, pkg2, pkg3: what's changed"

   # optionally use `git status` to check if the change set is correct
   # git status

   # push the change to your `dev` remote repository
   git push --set-upstream dev my-changes
   ```

5. Make a PR from your fork to the master branch of pingcap/tidb. For more information on how to make a PR, see [Making a Pull Request](https://guides.github.com/activities/forking/#making-a-pull-request) in GitHub Guides.

When making a PR, look at the [PR template](https://raw.githubusercontent.com/pingcap/tidb/master/.github/pull_request_template.md) and follow the commit message format, PR title format, and checklists.

After you create a PR, if your reviewer requests code changes, the procedure for making those changes is similar to that of making a PR, with some steps skipped:

1. Switch to the branch that is the head and get the latest changes:

   ```bash
   git checkout my-changes
   git pull
   ```

2. Make, stage, and commit your additional changes just like before.
3. Push those changes to your fork:

   ```bash
   git push
   ```

If your reviewer requests for changes with GitHub suggestion, you can commit the suggestion from the webpage. GitHub provides [documentation](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/reviewing-changes-in-pull-requests/incorporating-feedback-in-your-pull-request#applying-suggested-changes) for this case.

## Conflicts

When you edit your code locally, you are making changes to the version of pingcap/tidb that existed when you created your feature branch. As such, when you submit your PR it is possible that some of the changes that have been made to pingcap/tidb since then conflict with the changes you've made.

When this happens, you need to resolve the conflicts before your changes can be merged. First, get a local copy of the conflicting changes: checkout your local master branch with `git checkout master`, then `git pull master` to update it with the most recent changes.

### Rebasing

You're now ready to start the rebasing process. Checkout the branch with your changes and execute `git rebase master`.

When you rebase a branch on master, all the changes on your branch are reapplied to the most recent version of master. In other words, Git tries to pretend that the changes you made to the old version of master were instead made to the new version of master. During this process, you should expect to encounter at least one "rebase conflict." This happens when Git's attempt to reapply the changes fails because your changes conflict with other changes that have been made. You can tell that this happened because you'll see lines in the output that look like:

```text
CONFLICT (content): Merge conflict in file.go
```

When you open these files, you'll see sections of the form

```text
<<<<<<< HEAD
Original code
=======
Your code
>>>>>>> 8fbf656... Commit fixes 12345
```

This represents the lines in the file that Git could not figure out how to rebase. The section between `<<<<<<< HEAD` and `=======` has the code from master, while the other side has your version of the code. You'll need to decide how to deal with the conflict. You may want to keep your changes, keep the changes on master, or combine the two.

Generally, resolving the conflict consists of two steps: First, fix the particular conflict. Edit the file to make the changes you want and remove the `<<<<<<<`, `=======`, and `>>>>>>>` lines in the process. Second, check the surrounding code. If there was a conflict, it's likely there are some logical errors lying around too!

Once you're all done fixing the conflicts, you need to stage the files that had conflicts in them via git add. Afterwards, run `git rebase --continue` to let Git know that you've resolved the conflicts and it should finish the rebase.

Once the rebase has succeeded, you'll want to update the associated branch on your fork with `git push --force-with-lease`.

## Advanced rebasing

If your branch contains multiple consecutive rewrites of the same code, or if the rebase conflicts are extremely severe, you can use `git rebase --interactive master` to gain more control over the process. This allows you to choose to skip commits, edit the commits that you do not skip, change the order in which they are applied, or "squash" them into each other.

Alternatively, you can sacrifice the commit history like this:

```bash
# squash all the changes into one commit so you only have to worry about conflicts once
git rebase -i $(git merge-base master HEAD)  # and squash all changes along the way
git rebase master
# fix all merge conflicts
git rebase --continue
```

Squashing commits into each other causes them to be merged into a single commit. Both the upside and downside of this is that it simplifies the history. On the one hand, you lose track of the steps in which changes were made, but the history becomes easier to work with.

You also may want to squash together just the last few commits, possibly because they only represent "fixups" and not real changes. For example, `git rebase --interactive HEAD~2` allows you to edit the two commits only.
