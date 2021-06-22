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

We encourage quick, small changes. 300 lines is basically normal people can comprehend within an hour. The reviewer has the right to ask the PR author to split the PR if it is too large. For the PR that is hard to split, the code reviewers can ask the author to have a meeting in person to explain the changes, until they fully understand the changes.

### One PR just does one thing

To make the PR easier to understand and get merged faster, this is also highly encouraged.

For example, a bugfix should be in a separated PR, a refactoring should be in a separate PR. No matter how small it is, like updating the package version, or even one line changes to fix a typo, the change does exactly one thing and gets it right.

### Principles of the code review

* Technical facts and data overrules opinions and personal preferences
* Software design is about trade-off and there is no silver bullet

Everyone comes from different technical backgrounds with different knowledge. They have their own personal preferences. It is important that the code review is not based on biased opinions.

A common mistake is to focus too much on style. Style is important, that is why there are style guides. Just let the bot do most of the trivial work. The code reviewer is a human, who is supposed to focus on things beyond a bot can do. They must make sure that the logic is not broken by the changes, and the maintenance cost of the code base is not decreased.

Sometimes, making choices can be tricky.

Said that there is a special optimization that can improve the overall performance by 30%. However, it introduces a totally different code path and every feature later on has to consider this code path specially, which means a huge maintenance burden. Shall we accept or reject it?

Said that there is a critical bug and a PR is read to fix it, but the change is risky to introduce other kind of bugs. Shall we accept or reject it?

The answer is always “it depends”. Software design is more like a kind of art than technology. It is about aesthetics and your taste of the code. Trade-offs are always there and there is no perfect solution sometimes. Still, there is a general standard (from [@shenli](https://github.com/shenli), maybe we can call it "better than before?"):

* It is making something better, although not a perfect solution.
* It can mitigate the pain of the user.
* There is no bug introduced by the change itself.

Then the code can be accepted.

Of course, code review should have some minimal requirements.

For a bug fix PR, if it comes with no test case, the reviewer should ask the author to add tests.

For a performance improvement PR, if no benchmark result is provided, the reviewer should ask the author to attach a benchmark result.

## What to look for in a code review

### Design

The most important thing to cover in a review is the overall design.

Read the description of the PR, and if it's not easy to understand, ask the author to improve it. You may consider questions like:

* Does the change integrate well with the rest of our system?
* Is it a good time now to add this functionality?

[TiDB Internals forum](https://internals.tidb.io/) is a place for discussion. For pull requests that are created without prior consensus, try to seek consensus there.

### Functionality

* Does this PR do what the developer intend to do?
* Is what the developer intend to do good for the users with this implementation?

Basically, PR authors are expected to test their PRs well-enough before code reviews. However, as a reviewer you should still think about edge cases, especially for problems about concurrency.

You can always validate the PR if you want. It's hard to understand how some changes will impact a user when you're just reading the code, such as a UI change. You can ask the PR author to give you a demo of the functionality if it's too inconvenient to try it yourself.

### Logic

In the case that concurrent programming involved, it's particularly important to think about the logic in code review. These sorts of issues are very hard to detect by just running the code and usually need somebody to think carefully.

The human brain is just like a special machine, it is good at checking a small piece of logic before the states become too complex. Complexity is the biggest challenge of software.

### Complexity

Is the PR more complex than it should be? Check the following items for review the complexity of a PR:

* Are individual lines too complex?
* Are functions too complex?
* Are classes too complex?

"Too complex" usually means "can't be understood quickly by readers". It may also mean "developers are likely to introduce bugs when they try to call or modify this code".

A particular type of complexity is over-engineering, where developers have made the code more generic than it needs to be, or added functionality that isn’t presently needed by the system. Reviewers should be especially vigilant about over-engineering. Encourage developers to solve problems must to be solved now, not problems that a developer speculates might need to be solved in the future. 

### Tests

A PR should be test covered, whether the tests are unit tests, integration tests, or end-to-end tests.

Ensure the tests in the PR are correct, sensible, and useful.

* Are they covering interesting cases?
* Are they readable?
* Does the PR lower overall test coverage? 

Simulate cases where the code may break.

* Will the tests actually fail when the code is broken?
* If the code changes beneath them, will they start producing false positives?
* Does each test makes simple and useful assertions?
* Are the tests separated appropriately between different test methods?

Remember that tests are also code that have to be maintained, and thus do not accept unnecessary complexity in tests.

Last but not least, keep an eye on how long a single unit takes to run. That is, whether or not the CI is slowed by the tests introduced.

### Naming

Does the developer pick good names for everything? A good name is long enough to fully communicate what the item is or does, without being so long that it becomes hard to read.

### Comments

* Does the developer write clear comments in understandable English?
* Are all of the comments actually necessary?

Usually comments are useful when they explain why the code exists, while not explain what the code is doing. If the code isn't clear enough to explain itself, then the code should be made simpler.

There are some exceptions; for example, regular expressions and complex algorithms often benefit greatly from comments that explain what they’re doing. But mostly comments are for information that the code itself can hardly contain, like the reason behind a decision.

It can also be helpful to look at comments existing before this PR. Maybe there is a `TODO` can be removed now, a comment advising against this change being made, etc.

Note that comments are different from documentation of classes, modules, or functions, which should instead express the purpose of a piece of code, how it should be used, and how it behaves when used.

### Style

Make sure the PR follows our [code style and quality guide](code-style-and-quality-guide.md). For Go and Rust, there are built in tools with the compiler toolchain.

If you want to improve style points outside the style guide, you can comment that you think it would improve the code readability but isn't mandatory. Don't block PRs from being submitted based only on personal style preferences.

The PR author should not include major style changes combined with other changes. For example, if a PR wants to reformat the whole file should not make functional changes. This has been explained as "One PR just does one thing" in the previous section.

### Consistency

What if the existing code is inconsistent with the style guide? The style guide is the absolute authority: if something is required by the style guide, the PR should follow the guidelines.

In some cases, the style guide makes recommendations rather than declaring requirements. In these cases, it’s a judgment call whether the new code should be consistent with the recommendations or the surrounding code. Bias towards following the style guide unless the local inconsistency would be too confusing

If no other rule applies, the author should maintain consistency with the existing code.

Either way, encourage the author to file a bug and add a TODO for cleaning up existing code.

### Documentation

If a PR changes how users build, test, interact with, or release code, the reviewer are supposed to check whether it also updates related documentation, such as READMEs, and any generated reference docs. 

If a PR deletes or deprecates code, it should consider whether the documentation should also be deleted.

If documentation is missing, the reviewer should ask for it.

#### Error Handling

Be careful with error or exception handling. This is one of the most common places for bugs.

* Does the test cover the error code path?
* Does a panic make the whole process exit for server services?
* Does the code handle the resource releasing properly?
* Especially, for code including concurrent goroutines, is there a goroutine leak or memory leak after the error?

Sometimes it is difficult for a real program to run into the error code path, and even more difficult to reproduce and debug if it really happens. Then it is necessary to mock the error code path. Tools like [failpoint](https://github.com/pingcap/failpoint) are available for that purpose.

### Performance

Does the PR impose any performance impact? Sometimes a minor change on the hot path that seems unrelated may still affect performance. Is the algorithm in the PR suitable for that case?

## How to write code review comments

### Be respectful to the reviewees

Good reviewers are compassionate. Your code always need to be reviewed. And also you always need to review other contributors' code. Regard reviews as a learning process, and everyone wins.

### Ask questions rather than make statements

Wording is very important. Try to be constructive in your feedback, rather than critical. You can do this by asking questions, rather than making statements. And remember to give praise alongside your constructive feedback.

### Offer sincere praise

Most reviewers focus only on what’s wrong with the code, but they should offer encouragement and appreciation for good practices, as well. It’s sometimes even more valuable, in terms of mentoring, to tell a developer what they did right than to tell them what they did wrong.

For example, imagine you’re reviewing for an author who struggles to write documentation, and you come across a clear, concise function comment. Let them know they nailed it. They will improve faster if you tell them when they got it right instead of just waiting to ding them when they screw up.

#### Summary

* Be kind to the coder, not to the code.
* Ask questions rather than make statements.
* Treat people who know less than you with respect, deference, and patience.
* Remember to praise when the code quality exceeds your expectation.
* It isn't necessarily wrong if the coder's solution is different from yours.
* Refer to the code style document when necessary.

## Review with the @ti-chi-bot

The TiDB community is using a service called [@ti-chi-bot](https://book.prow.tidb.io/#/en/) to help with the review of the pull requests.

You can see the full list of commands accepted by the bot in [this page](https://prow.tidb.io/command-help?repo=pingcap%2Ftidb).

Here are the most frequent commands you are like gonna use during a review.

* `/cc @reviewer` requests a review from the reviewer.
* `/assign @committer` assigns a committer to help merge the pull request
* GitHub reviewing `Approve` or `Request Changes` from reviewers or committers creates a LGTM or veto to the pull request.
