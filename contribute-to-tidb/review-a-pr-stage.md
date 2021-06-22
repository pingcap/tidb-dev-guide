# How to Review a Pull Request

This guide is for contributors who want to contribute to the code review. Thank you for your effort. A good review of code is crucial for an open source project.

 This guide is intended to help both the contributors and reviewers to ensure the following:

* The review keeps the high quality of TiDB code.
* Reviewers cover all important aspects of a contribution
* Contributors have a good contribution experience..
* The review avoids situations in which contributors and reviewers spend a lot of time refining a contribution that gets rejected later.


## Things to know before the code review

Why is code review so important?

* A good review can eliminate bugs early.
* A good review can make the project maintainable in the long run.

To conduct a good review, it is always helpful to read the following high-level guidelines about code review in the TiDB community:

### Code review is more important than writing your own PR

Nowadays software development is no longer a single person’s piece of art but the result of team cooperation. To speed up the development and make the processing scale, it is important to avoid blocking. If all developers in an organization prioritize writing code over reviewing code, more and more PRs waiting for code review get blocked, and the whole team slows down.

### It's the PR author's responsibility to get the PR merged

Because PR authors are the ones who want to merge the PRs into the repository the most, after an offline discussion we agree on the following:

* PR authors are responsible for getting PRs reviewed and merged.
* PR reviewers are responsible for reviewing PRs and providing feedback in time but not responsible for pushing the PR to be merged.

### Two Approvals for a PR to be accepted

In the TiDB community, most repositories require two approvals before a PR can be accepted. A few repositories require a different number of approvals, but two approvals are the default setting. 

Two approvals ensure that even the original PR author resigns, there is still someone who is familiar with the code and can keep the project moving. And if the author really resigns, the code reviewer becomes the first person who is responsible for the code.

### Never approve code you don't understand

A review should be thorough enough. After the review, you should be able to explain the change details at a reasonable level to other developers. This ensures that the details of the codebase are known to more than a single person. Remember: you are responsible for the code you review; it is all about your reputation.

### PRs must be 300 lines or less

The TiDB community encourages quick and small changes in each PR. Three hundred lines is basically what normal people can comprehend in an hour.

If a PR is too large, you can request the PR author to split the PR. If a PR is too large but hard to split, you can request the author to have a meeting in person to explain the changes, until you fully understand the changes.

### One PR does one thing

To make the PR easier to understand and get merged faster, it should focus on one thing.

For example, a bug fix should be in one PR and a refactoring in another. No matter how small it is, like updating the package version, or even one line changes to fix a typo, the change does exactly one thing and gets it right.

### Principles of the code review

* Technical facts and data overrule opinions and personal preferences.
* Software design is about trade-offs, and there is no silver bullet.

Everyone comes from different technical backgrounds with different knowledge. They have their own personal preferences. It is important that the code review is not based on biased opinions.

A common mistake is to focus too much on style. Style is important, that is why there are style guides. Just let the bot do most of the trivial work. The code reviewer is a human, who is supposed to focus on things beyond a bot can do. They must make sure that the logic is not broken by the changes, and the maintenance cost of the code base is not decreased.

Sometimes, making choices can be tricky.

For example, let's say there is a special optimization that can improve the overall performance by 30%. However, it introduces a totally different code path, and every subsequent feature must consider it. This creates a huge maintenance burden. Shall we accept or reject it?

Or let's say there's a critical bug and a PR is read to fix it, but there's a risk the PR will introduce other bugs. Shall we accept or reject it?

If a PR under your review is in these tricky situations, what is the right choice, accepting the PR or rejecting it? The answer is always "it depends." Software design is more like a kind of art than technology. It is about aesthetics and your taste of the code. There are always trade-offs, and often there's no perfect solution. Still, there is a general standard (from [@shenli](https://github.com/shenli)). Maybe we call it, "Better than before?":

* The change is making something better, although not a perfect solution.
* The change can mitigate the pains of users.
* The change does not introduce a bug.

Then, we can accept the code.

Besides, you should also check some minimal requirements of code reviews.

If a bug fix PR doesn't include a test case, the review should ask the author to add tests.

If a performance improvement PR doesn't include a benchmark result, the reviewer should ask the author to attach one.

## What to check in a code review

### Design

The most important thing of a review is checking the overall design.

To learn the overall design of a PR, you can read the description of the PR. If the description is unclear or hard to understand, you can request the author to improve it. You may consider asking questions such as the following:

* Does the change integrate well with the rest of our system?
* Is now a good time to add this functionality?

If you need a further discussion of the PR, you can go to [TiDB Internals forum](https://internals.tidb.io/). For pull requests that are created without prior consensus, try to seek consensus there too.

### Functionality

* Does this PR do what the developer intends it to do?
* How will implementing this PR help the user?

Basically, PR authors are supposed to sufficiently test their PRs before code reviews. However, as a reviewer, you should still think about edge cases, especially for problems about concurrency.

You can always validate the PR if you want. 

For some changes such as UI, it is hard to understand how the changes will impact users when you are just reading the code. In this case, if it is too inconvenient to try it yourself, you can ask the PR author to give you a demo of the functionality.

### Logic

When concurrent programming is involved, it's particularly important to think about the logic in code review. These sorts of issues are very hard to detect by just running the code and usually need somebody to think carefully.

### Complexity

Is the PR more complex than it should be? To learn that, you can check the following items when reviewing the complexity of the PR:

* Are individual lines too complex?
* Are functions too complex?
* Are classes too complex?

"Too complex" usually means "the code changes cannot be understood quickly by readers" or "PR authors are likely to introduce bugs when they try to call or modify the code".

A particular type of complexity is over-engineering, which means that PR authors have made the code more generic than it needs to be, or added functionality that is not presently needed by the system. Reviewers should be especially vigilant about over-engineering. The TiDB community encourages PR authors to solve the problems that must be solved now -- not the problems that might need to be solved in the future. 

### Tests

A PR should be test covered, whether the tests are unit tests, integration tests, or end-to-end tests.

To ensure the tests in the PR are correct, sensible, and useful, you can check the following:

* Whether the tests cover all interesting cases?
* Are the test cases readable?
* Does the PR lower the overall test coverage? 

To ensure the tests in the PR are sufficient, you can simulate cases where the code may break and check the following:

* Will the tests fail when the code is broken?
* Does each test make simple and useful assertions?
* Are the tests separated appropriately between different test methods?

Remember that tests are also code that have to be maintained, and thus do not accept unnecessary complexity in tests.

Last but not least, keep an eye on how long a single unit takes to run. That is, determine whether the test slow down the CI.

### Naming

Does the developer pick good names for everything? A good name is long enough to fully communicate what the item is or does, without being so long that it becomes hard to read.

### Comments

* Does the developer write clear comments in understandable English?
* Are all of the comments actually necessary?

Usually, comments are useful when they explain why the code exists, while not explain what the code is doing. If the code isn't clear enough to explain itself, then the code should be simplified.

There are some exceptions; for example, regular expressions and complex algorithms often benefit greatly from comments that explain what they’re doing. But comments are mostly for information, like the reason behind a decision.

It can also be helpful to look at comments existing before this PR. Maybe there is a `TODO` can be removed now, a comment advising against this change being made, etc.

Note that comments are different from documentation of classes, modules, or functions, which should instead express the purpose of a piece of code, how it should be used, and how it behaves when used.

### Style

Make sure the PR follows our [code style and quality guide](code-style-and-quality-guide.md). For Go and Rust, there are built-in tools with the compiler toolchain.

If you want to improve style points outside the style guide, you can comment that you think it would improve the code readability but isn't mandatory. Don't block PRs from being submitted based only on personal style preferences.

The PR author should not combine nontrivial style changes with functional changes. This would violate the guideline covered earlier: one PR does one thing.

### Consistency

What if the existing code is inconsistent with the style guide? The style guide is the absolute authority: if something is required by the style guide, the PR should follow the guidelines.

In some cases, the style guide only makes recommendations but does not declare requirements. In these cases, it is a judgment call whether the new code should be consistent with the recommendations in the style guide or with the surrounding code. It is recommended that you follow the style guide unless the local inconsistency is too confusing.

If no other rule applies, the PR author should maintain consistency with the existing code.

In either way, you can encourage the author to file a bug and add a TODO for cleaning up existing code.

### Documentation

During the code review, if you notice that a PR changes how users build, test, interact with, or release code, you must check whether it also updates the related documentation such as READMEs and any generated reference docs. 

Similarly, if a PR deletes or deprecates code, you must check whether or not the corresponding documentation should also be deleted.

If any documentation updates are missing, you can request the PR author to add the updates.

#### Error Handling

Because errors and exceptions handling are one of the most possible places for bugs, during the code review, you must be as prudent as possible and ask yourself the following questions: 

* Does the test of the PR cover the error code path?
* Does a panic make the whole process exit for server services?
* Does the code properly handle the resource releasing?
* Especially for code including concurrent goroutines, is there a goroutine leak or memory leak after the error?

Sometimes, it is difficult for a real program to run into the error code path, and even more difficult to reproduce and debug if the error really happens. In this case, it is necessary to mock the error code path using tools such as [failpoint](https://github.com/pingcap/failpoint).

### Performance

Does the PR impact performance? Sometimes, a seemingly minor, unrelated change on the hot may still affect performance.

Is the algorithm in the PR suitable for that case?

## How to write code review comments

### Be respectful to PR authors

Good reviewers are compassionate. While you are reviewing the code of a PR author, at the same time, your own code might be under the review of other reviewers too.  If you regard code review as a learning process, then everyone wins.

### Ask questions instead of making statements

The wording of the review comments is very important. To provide review comments that are constructive rather than critical, you can try asking questions rather than making statements. Along with your constructive feedback, you are recommended to give your praise too.

### Offer sincere praise

Good PR reviewers focus not only on what is wrong with the code but also on good practices in the code. As a PR reviewer, you are recommended to offer your encouragement and appreciation to PR authors for the good practices in the code. In terms of mentoring, telling PR authors what they did is right is even more valuable than telling them what they did is wrong.

For example, suppose that you are reviewing a PR created by an author who struggles to write documentation, and you come across a clear, concise function comment in the PR. Then, you are recommended to tell such PR authors that they nailed it. To help the PR authors improve faster, tell the authors when they get it right instead of just waiting to ding them when they screw up.

### Summary

* Be kind to PR authors, not to the code.
* Ask questions instead of making statements.
* Treat people who know code less than you with respect, deference, and patience.
* Offer your praise when the code quality exceeds your expectation.
* It is not necessarily wrong if the solution of a PR author is different from yours.
* Refer to the code style document if necessary.

## Review with the @ti-chi-bot

The TiDB community uses a service called [@ti-chi-bot](https://book.prow.tidb.io/#/en/) to help with the review of the pull requests.

You can see the full list of commands accepted by the bot at [this page](https://prow.tidb.io/command-help?repo=pingcap%2Ftidb).

Here are the most frequent commands you're gonna use during a review:

* `/cc @reviewer` requests a review from the reviewer.
* `/assign @committer` assigns a committer to help merge the pull request
* GitHub reviewing `Approve` or `Request Changes` from reviewers or committers creates a LGTM or veto to the pull request.
