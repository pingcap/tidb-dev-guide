# Write Document

Good documentation is crucial for any kind of software. This is especially true for sophisticated software systems such as distributed database like TiDB. The TiDB community aims to provide concise, precise, and complete documentation and welcomes any contribution to improve TiDB's documentation.

## Where you can contribute

The TiDB community provides bilingual documentation. The [English documentation](https://docs.pingcap.com/) is maintained in the [pingcap/docs](https://github.com/pingcap/docs) repository (docs repo) and the [Chinese documentation](https://docs.pingcap.com/zh/) is maintained in the [pingcap/docs-cn](https://github.com/pingcap/docs-cn) repository (docs-cn repo). You are welcome to contribute to either of the repositories.

In addition, you are also welcome to contribute to the [TiDB Operator documentation](https://github.com/pingcap/docs-tidb-operator).

This guide walks you through what and how you can contribute to the TiDB bilingual documentation in docs-cn and docs repos.

## What you can contribute

You can start from any one of the following items to help improve the TiDB [English documentation](https://docs.pingcap.com/) or [Chinese documentation](https://docs.pingcap.com/zh/).

- Fix typos or format (punctuation, space, indentation, code block, etc.)
- Fix or update inappropriate or outdated descriptions
- Add missing content (sentence, paragraph, or a new document)
- Translate docs changes from English to Chinese, or from Chinese to English. See [How we implement bilingual documentation](#how-we-implement-bilingual-documentation)
- Submit, reply to, and resolve [docs issues](https://github.com/pingcap/docs/issues) or [docs-cn issues](https://github.com/pingcap/docs-cn/issues)
- (Advanced) Review Pull Requests created by others

## Before you contribute

Before you contribute, let's take a quick look at some general information about TiDB documentation maintenance. This can help you to become a contributor soon.

### Get familiar with style

- [Commit Message Style](https://github.com/pingcap/community/blob/master/contributors/commit-message-pr-style.md#how-to-write-a-good-commit-message)
- [Pull Request Title Style](https://github.com/pingcap/community/blob/master/contributors/commit-message-pr-style.md#pull-request-title-style)
- [Markdown Rules](https://github.com/pingcap/docs/blob/master/resources/markdownlint-rules.md)
- [Code Comment Style](https://github.com/pingcap/community/blob/master/contributors/code-comment-style.md)
- Diagram Style: [Figma Quick Start Guide](https://github.com/pingcap/community/blob/master/contributors/figma-quick-start-guide.md)

    To keep a consistent style for diagrams, we recommend using [Figma](https://www.figma.com/) to draw or design diagrams. If you need to draw a diagram, refer to the guide and use shapes or colors provided in the template.

### Learn about doc versions

Currently, we maintain versions of TiDB documentation using branches, each doc version with a separate branch.

- The [documentation under development](https://docs.pingcap.com/tidb/dev) is maintained in the `master` branch.
- The [published documentation](https://docs.pingcap.com/tidb/stable/) is maintained in the corresponding `release-<verion>` branch.
- The [archived documentation](https://docs-archive.pingcap.com/) is no longer maintained and does not receive any further updates.

### Use cherry-pick labels

As changes to one doc version often apply to other doc versions as well, we introduce ti-chi-bot to automate the PR cherry-pick process based on cherry-pick labels.

- If your changes apply to only one doc version, just create a PR based on the branch of the doc version. There is no need to add any cherry-pick labels.

- If your changes apply to multiple doc versions, instead of creating multiple PRs, you can just create one PR based on the latest applicable branch, and then add one or several `needs-cherry-pick-release-<version>` labels to the PR according to the applicable doc versions. Then, after the PR is merged, ti-chi-bot will automatically create the corresponding cherry-pick PRs based on the branches of the specified versions.

- If most of your changes apply to multiple doc versions but some differences exist among versions, besides adding the cherry-pick labels to all the target versions, you also need to add the `requires-version-specific-change` label as a reminder to the PR reviewer. After your PR is merged and ti-chi-bot creates the corresponding cherry-pick PRs, you can still make changes to these cherry-pick PRs.

## How to contribute

Your contribution journey is in two stages:

1. In [stage 1](#stage-1-create-and-submit-your-pr), create your Pull Request for the [docs-cn](https://github.com/pingcap/docs-cn) or [docs](https://github.com/pingcap/docs) repository.

2. In [stage 2](#stage-2-get-notified-and-address-review-comments), address comments from reviewers until the PR gets approved and merged.

### Stage 1: Create your PR

Perform the following steps to create your Pull Request for the [docs](https://github.com/pingcap/docs) repository. If don't like to use commands, you can also use [GitHub Desktop](https://desktop.github.com/), which is easier to get started.

> **Note:**
>
> This section takes creating a PR to the `master` branch in the docs repository as an example. Steps of creating PRs to other branches or to the docs-cn repository are similar.

#### Step 0: Sign the CLA

Your PR can only be merged after you sign the [Contributor License Agreement (docs)](https://cla-assistant.io/pingcap/docs). Please make sure you sign the CLA before continuing.

#### Step 1: Fork the repository

1. Visit the project: <https://github.com/pingcap/docs>
2. Click the **Fork** button on the top right and wait it to finish.

#### Step 2: Clone the forked repository to local storage

```
cd $working_dir # Comes to the directory that you want put the fork in, for example, "cd ~/Documents/GitHub"
git clone git@github.com:$user/docs.git # Replace "$user" with your GitHub ID

cd $working_dir/docs
git remote add upstream git@github.com:pingcap/docs.git # Adds the upstream repo
git remote -v # Confirms that your remote makes sense
```

#### Step 3: Create a new branch

1. Get your local master up-to-date with upstream/master.

    ```
    cd $working_dir/docs
    git fetch upstream
    git checkout master
    git rebase upstream/master
    ```

2. Create a new branch based on the master branch.

    ```
    git checkout -b new-branch-name
    ```

#### Step 4: Make doc changes

Edit some file(s) on the `new-branch-name` branch and save your changes. You can use editors like Visual Studio Code to open and edit `.md` files.

#### Step 5: Commit your changes

```
git status # Checks the local status
git add <file> ... # Adds the file(s) you want to commit. If you want to commit all changes, you can directly use `git add.`
git commit -m "commit-message: update the xx"
```

See [Commit Message Style](https://github.com/pingcap/community/blob/master/contributors/commit-message-pr-style.md#how-to-write-a-good-commit-message).

#### Step 6: Keep your branch in sync with upstream/master

```
# While on your new branch
git fetch upstream
git rebase upstream/master
```

#### Step 7: Push your changes to the remote

```
git push -u origin new-branch-name # "-u" is used to track the remote branch from origin
```

#### Step 8: Create a pull request

1. Visit your fork at <https://github.com/$user/docs> (replace `$user` with your GitHub ID)
2. Click the `Compare & pull request` button next to your `new-branch-name` branch to create your PR. See [Pull Request Title Style](https://github.com/pingcap/community/blob/master/contributors/commit-message-pr-style.md#pull-request-title-style).

Now, your PR is successfully submitted.

### Stage 2: Address review comments

After your PR is created, addressing review comments is just as important as creating the PR. Please perform the following steps to complete your contribution journey.

#### Step 1: Get notified of review comments

After your PR is created, the repository maintainers will add labels to your PR for PR management and the documentation reviewers will add comments to the PR.

Once the review comments are submitted, you will receive a notification mail in your registered email box. You can click the PR link in the mail to open the PR page and see the comments.

#### Step 2: Address review comments

The review comments require you to change your submitted PR content. You can either accept a suggestion and make the change, or decline the suggestion and submit your reply right under the comment stating your reason.

##### Accept comments in your local editor

To accept suggestions, perform the following steps to modify your submitted PR content:

1. Pull the latest content from the remote origin of your PR to your local by executing the following commands in the terminal. This ensures that your local content is up-to-date with the remote origin.

    ```
    cd $working_dir/docs
    git checkout new-branch-name
    git fetch origin
    ```

2. Edit the file or files to be modified in your local editor (like Visual Studio Code) according to the review comments.

3. Commit your changes. This step is the same as [Step 5: Commit your changes](#step-5-commit-your-changes) in stage 1.

    ```
    git status # Checks the local status
    git add <file> ... # Adds the file(s) you want to commit. If you want to commit all changes, you can directly use `git add.`
    git commit -m "commit-message: update the xx"
    ```

4. Push your changes to the remote origin:

    ```
    git push -u origin new-branch-name # "-u" is used to track the remote branch from origin
    ```

5. After all comments are addressed, reply on the PR page: "All comments are addressed. PTAL."

    "PTAL" is short for "Please take a look".

##### Accept comments on the PR page

If a review comment is in the suggestion mode where the reviewer has already made the suggested change for you (with highlighted differences), to accept the suggestion, you only need to click the "Commit suggestion" button. Then the suggested change is automatically committed to your PR.

If multiple review comments are in the suggestion mode, it is recommended to accept them in a batch. To do that, perform the following steps on the PR page:

1. Click the "Files changed" tab and see the file changes. You can see multiple review comments in suggestion mode.

2. Choose the suggestions you want to commit by clicking the "Add suggestion to batch" button on each suggestion.

3. After all suggestions to be committed are chosen, click the "Commit suggestions" button on the upper right corner of the PR page. Then, you have successfully committed all suggested changes.

> **Note:**
>
> After you have addressed review comments, reviewers might also submit new comments. You need to repeat this step 2 and make sure all comments are addressed until the reviewers approve your PR and have it merged.

#### Step 3: Handle cherry-picked PRs

Once your PR gets approved, the repo committers will have your PR merged into the docs upstream/master. After a few minutes, ti-chi-bot automatically creates PRs to other versions as you have specified by adding cherry-pick labels.

You need to perform the following steps on each one of the cherry-picked PRs:

- Check whether the cherry-picked content is exactly what you want to commit to that release version. If yes, please comment "LGTM", which means "Looks good to me". The repository committers will merge it soon.

- If most of your changes apply to multiple doc versions but some differences exist among versions, make changes by commenting in the cherry-picked PR instructing how you would like to make version-specific changes. Then the repository committers will commit to the PR according to your comment before you approve it.

- (Advanced) If any conflicts exist in the cherry-picked PR, resolve the conflicts. This is only for those who have the write permission in the repository.

After the steps above are completed, the committers will merge the cherry-picked PRs. At this point, your contribution journey is completed! 🎉

## How we implement bilingual documentation

TiDB documentation is usually written in one language and then translated to another. We use GitHub labels in docs-cn and docs repos (as well as in docs-tidb-operator and docs-dm repos) to track the entire translation or alignment process.

The following labels are used:

- `translation/doing`: This PR needs translation, or the translation is on the way.
- `translation/done`: This PR has been translated in another PR.
- `translation/from-docs`: This PR is translated from a docs PR.
- `translation/from-docs-cn`: This PR is translated from a docs-cn PR.
- `translation/no-need`: This PR does not need translation.

The following process describes how a docs-cn PR (Chinese content) is translated and aligned to the docs repo (English content). The translation from docs to docs-cn is similar.

1. Once a PR is created in docs-cn that updates the Chinese documentation, the repo administrator will soon add a `translation/doing` or `translation/no-need` label and an assignee (translator) to the PR. The tracking process begins.

    The assignee regularly checks his or her PR list for translation. To check out his or her translation list, use the GitHub search syntax `is:pr assignee:@GitHub_ID is:merged label:translation/doing` in the GitHub search box on the [GitHub Pull Requests page](https://github.com/pulls).

    PRs with the `translation/no-need` label are not tracked.

2. After this docs-cn PR is merged, the assignee starts the translation in the local editor.

3. Once the assignee submits the translated content in a docs PR, he or she adds the `translation/from-docs-cn` label to the docs PR, removes the `translation/doing` label from the docs-cn PR, and adds the `translation/done` label to the docs-cn PR.

4. The assignee provides the docs-cn PR link in the PR description section of the docs PR ("This PR is translated from"). The reviewer will know from which docs-cn PR the docs PR is translated. At the same time, a reverse link is automatically generated in the docs-cn PR.

5. After the docs PR is merged. The translation tracking process is finished. The updates in Chinese documentation are synchronized to the English documentation.

If you want to apply for a translation, check the following lists of merged docs-cn/docs PRs with the `translation/doing` label, pick one PR, assign yourself with your GitHub ID, and start the process from step 2 above.

- The list of PR that can be translated in docs-cn: [Pull requests · pingcap/docs-cn](https://github.com/pingcap/docs-cn/pulls?q=is%3Apr+label%3Atranslation%2Fdoing+is%3Amerged)
- The list of PR that can be translated in docs: [Pull requests · pingcap/docs](https://github.com/pingcap/docs/pulls?q=is%3Apr+is%3Amerged+label%3Atranslation%2Fdoing+)