# Write Document

Good documentation is crucial for any kind of software. This is especially true for sophisticated software systems such as distributed database like TiDB. The TiDB community aims to provide concise, precise, and complete documentation and welcomes any contribution to improve TiDB's documentation.

## Where you can contribute

The TiDB community provides bilingual documentation. The English documentation is maintained in the [pingcap/docs](https://github.com/pingcap/docs) repository (docs repo) and the Chinese documentation is maintained in the [pingcap/docs-cn](https://github.com/pingcap/docs-cn) repository (docs-cn repo). You are welcome to contribute to either of the repositories.

In a addition, you are also welcome to contribute to the [TiDB Operator documentation](https://github.com/pingcap/docs-tidb-operator) and the [TiDB Data Migration documentation](https://github.com/pingcap/docs-dm).

This guide walks you through what and how you can contribute to the TiDB bilingual documentation in docs-cn and docs repos.

## What you can contribute

You can start from any one of the following items to help improve TiDB Docs at the PingCAP website ([en](https://docs.pingcap.com/tidb/stable) and [zh](https://docs.pingcap.com/zh/tidb/stable)):

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
- [Markdown Rules](/resources/markdownlint-rules.md)
- [Code Comment Style](https://github.com/pingcap/community/blob/master/contributors/code-comment-style.md)
- Diagram Style: [Figma Quick Start Guide](https://github.com/pingcap/community/blob/master/contributors/figma-quick-start-guide.md)

    To keep a consistent style for diagrams, we recommend using [Figma](https://www.figma.com/) to draw or design diagrams. If you need to draw a diagram, refer to the guide and use shapes or colors provided in the template.

### Learn about docs versions

Currently, we maintain seven versions of TiDB documentation, each with a separate branch:

| Docs branch name | Version description |
| :--- | :--- |
| `master` branch | the latest development version |
| `release-5.1` branch | the 5.1 version |
| `release-5.0` branch | the 5.0 stable version |
| `release-4.0` branch | the 4.0 stable version |
| `release-3.1` branch | the 3.1 stable version |
| `release-3.0` branch | the 3.0 stable version |
| `release-2.1` branch | the 2.1 stable version |

Each docs version is updated very frequently and changes to one version often apply to another version or other versions as well. We introduce ti-chi-bot to automatically file PRs to other versions as long as you add corresponding cherry-pick labels to your PR.

### Use cherry-pick labels

- If your changes apply to only one doc version, just submit a PR to the corresponding version branch.

- If your changes apply to multiple doc versions, you don't have to submit a PR to each branch. Instead, after you submit your PR, trigger the ti-chi-bot to submit a PR to other version branches by adding one or several of the following labels as needed. Once the current PR is merged, ti-chi-bot will start to work.
    - `needs-cherry-pick-release-5.1` label: ti-chi-bot will submit a PR to the `release-5.1` branch.
    - `needs-cherry-pick-release-5.0` label: ti-chi-bot will submit a PR to the `release-5.0` branch.
    - `needs-cherry-pick-release-4.0` label: ti-chi-bot will submit a PR to the `release-4.0` branch.
    - `needs-cherry-pick-release-3.1` label: ti-chi-bot will submit a PR to the `release-3.1` branch.
    - `needs-cherry-pick-release-3.0` label: ti-chi-bot will submit a PR to the `release-3.0` branch.
    - `needs-cherry-pick-release-2.1` label: ti-chi-bot will submit a PR to the `release-2.1` branch.
    - `needs-cherry-pick-master` label: ti-chi-bot will submit a PR to the `master` branch.

- If most of your changes apply to multiple doc versions but some differences exist among versions, you still can use cherry-pick labels to let ti-chi-bot create PRs to other versions. In this situation, you also need to add the `requires-version-specific-change` label as a reminder to the PR reviewer. After the PR to another version is successfully submitted by ti-chi-bot, you can make changes to that PR.

## How to contribute

Your contribution journey is in two stages:

1. In [stage 1](#stage-1-create-and-submit-your-pr), create and submit your Pull Request to the [docs-cn](https://github.com/pingcap/docs-cn) or [docs](https://github.com/pingcap/docs) repository.

2. In [stage 2](#stage-2-get-notified-and-address-review-comments), get notified of any review comments and address the comments until the PR gets approved and merged.

### Stage 1: Create and submit your PR

Perform the following steps to create your Pull Request to the [docs](https://github.com/pingcap/docs) repository. If don't like to use commands, you can also use [GitHub Desktop](https://desktop.github.com/), which is easier to get started.

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

#### Step 4: Do something

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

### Stage 2: Get notified and address review comments

After your PR is submitted, addressing review comments is just as important as creating the PR. Please perform the following steps to complete your contribution journey.

#### Step 1: Get notified of review comments

After your PR is created, the repository administrator will add labels to your PR for PR management. Review comments will also be submitted to your PR, which requires you to modify the PR content.

Once the review comments are submitted, you will receive a notification in your registered email box. Check your email box and get notified.

Once you receive the email, click the PR link in the mail to open the PR page in your browser, and you will see the comments.

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

Once your PR gets approved, the repo administrator will have your PR merged into the docs upstream/master. After a few minutes, ti-chi-bot automatically creates PRs to other versions as you have specified by adding cherry-pick labels.

You need to perform the following steps on each one of the cherry-picked PRs:

- Check whether the cherry-picked content is exactly what you want to commit to that release version. If yes, please comment "LGTM", which means "Looks good to me". The repository administrator will merge it soon.

- If most of your changes apply to multiple doc versions but some differences exist among versions, make changes by commenting in the cherry-picked PR instructing how you would like to make version-specific changes. Then the repository administrator will commit to the PR according to your comment before you approve it.

- (Advanced) If any conflicts exist in the cherry-picked PR, resolve the conflicts. This is only for those who have the write permission in the repository.

After the steps above are completed, the administrator will merge the cherry-picked PRs. At this point, your contribution journey is completed! 🎉

## How we implement bilingual documentation

TiDB documentation is usually written in one language and then translated to another. We use GitHub labels in docs-cn and docs repos (as well as in docs-tidb-operator and docs-dm repos) to track the entire translation or alignment process.

The following labels are used:

- `translation/doing`: This PR needs translation, or the translation is on the way.
- `translation/done`: This PR has been translated in another PR.
- `translation/from-docs`: This PR is translated from a docs PR.
- `translation/from-docs-cn`: This PR is translated from a docs-cn PR.
- `translation/no-need`: This PR does not need translation.

If you want to apply for a translation, check the following lists of merged docs-cn/docs PRs with the `translation/doing` label, pick one PR, assign yourself with your GitHub ID, and start the process from step 2 below.

- The list of PR that can be translated in docs-cn: [Pull requests · pingcap/docs-cn](https://github.com/pingcap/docs-cn/pulls?q=is%3Apr+label%3Atranslation%2Fdoing+is%3Amreged+no%3Aassignee+)
- The list of PR that can be translated in docs: [Pull requests · pingcap/docs](https://github.com/pingcap/docs/pulls?q=is%3Apr+label%3Atranslation%2Fdoing+is%3Amreged+no%3Aassignee+)

The following process describes how a docs-cn PR (Chinese content) is translated and aligned to the docs repo (English content). The translation from docs to docs-cn is similar.

1. Once a PR is created in docs-cn that updates the Chinese documentation, the repo administrator will soon add a `translation/doing` or `translation/no-need` label and an assignee (translator) to the PR. The tracking process begins.

    The assignee regularly checks his or her PR list for translation. To check out his or her translation list, use the GitHub search syntax `is:pr assignee:@GitHub_ID is:merged label:translation/doing` in the GitHub search box on the [GitHub Pull Requests page](https://github.com/pulls).

    PRs with the `translation/no-need` label are not tracked.

2. After this docs-cn PR is merged, the assignee starts the translation in the local editor.

3. Once the assignee submits the translated content in a docs PR, he or she adds the `translation/from-docs-cn` label to the docs PR, removes the `translation/doing` label from the docs-cn PR, and adds the `translation/done` label to the docs-cn PR.

4. The assignee provides the docs-cn PR link in the PR description section of the docs PR ("This PR is translated from"). The reviewer will know from which docs-cn PR the docs PR is translated. At the same time, a reverse link is automatically generated in the docs-cn PR.

5. After the docs PR is merged. The translation tracking process is finished. The updates in Chinese documentation are synchronized to the English documentation.

## Contact

Join the Slack channel: [#sig-docs](https://slack.tidb.io/invite?team=tidb-community&channel=sig-docs&ref=pingcap-docs)
