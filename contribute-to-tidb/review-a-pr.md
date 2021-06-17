# How to Review a Pull Request

This guide is for all contributors that want to help with reviewing code contributions. Thank you for your effort - good reviews are one of the most important and crucial parts of an open source project. This guide should help the community to make reviews such that:

* Contributors have a good contribution experience.
* Our reviews check all important aspects of a contribution.
* We make sure to keep a high code quality in TiDB.
* We avoid situations where contributors and reviewers spend a lot of time refining a contribution that gets rejected later.


## 1. Things to know before the code review

Why is code review important?

* Erase bugs early
* Make the project maintainable in the long run

Some high level guidelines about code review in PingCAP (and mostly applies the TiDB community also):

### Code review is more important than writing your own PR

Modern software development is about cooperation, and nowadays software is no longer one single man’s piece of art. To speed up the development and make the processing scale, it is important to avoid blocking. If the members in an organization give higher priority for writing their own code, others waiting for code review get blocked, and there will be a lot of pending PRs for review. Eventually most of the developers get blocked, the whole team slows down.

### It's the author's responsibility to get the PR merged

We had a fierce debate on how to speed up the review process long long ago. What the role the reviewer and PR owner should play and what is each of their responsibility to get the PR merged faster.
After the meeting, most of us agree with the conclusion that the PR owner is responsible for getting his PR merged. He is the one who most wanted to merge the PR into the repository. He is willing to lead that change. So he should try to do his best to have someone review his PR. The code reviewers should review the PR in time and give feedback, but it is not their responsibility to push the PR to be merged.

### 2 LGTM for a PR to be accepted

For most of the projects in PingCAP, we require 2 LGTM before the PR is accepted. There do have some exceptions, but this is the default setting. 2 LGTM ensures that even after the original PR author's resignation, there is someone familiar with the code and the project still keeps moving. And if that really happens, the code reviewer is the first person responsible for the code.

### Never give LGTM to to the code you don't understand

A review should be thorough enough that the reviewer could explain the change at a reasonable level of detail to another developer. This ensures that the details of the code base are known to more than a single person. Remember: you are responsible for the code you reviewed, it is all about your reputation.

### No more than 300 lines for each PR

We encourage quick, small changes. 300 lines is basically normal people can comprehend within an hour. The reviewer has the right to ask the PR author to split the PR if it is too large. For the PR that is hard to split, the code reviewers can ask the author to have a meeting in person to explain the changes, until they fully understand the changes.

### One PR just does one thing

To make the PR easier to understand and get merged faster, this is also highly encouraged.
For example, a bug fix should be in a separate PR, a refactoring should be in a separate PR. No matter how small it is, like updating the package version, or even one line changes to fix a typo, the change does exactly one thing and gets it right.

Principles of the code review

* Technical facts and data overrules opinions and personal preferences
* Software design is about trade-off and there is no perfect

Everyone comes from different technical backgrounds with different knowledge. They have their own personal preferences. It is important that the code review is not based on biased opinions.

A common mistake is to focus too much on style. Style is important, that is why there are style guides. Just let the bot do most of the trivial work. The code reviewer is a human, he should focus on what the bot can not do. They must make sure that the logic is not broken by the changes, and the maintenance cost of the code base is not decreased.

Sometimes, making choices can be tricky. There is a special optimization that can improve the overall performance by 30%. However, it introduces a totally different code path and every feature later on has to consider this code path specially, it means a huge maintenance burden. Should we accept or reject it? There is an emergency and someone has a PR to fix it, but that change is risky to introduce other kind of bugs. Should we accept or reject it?

The answer is always “it depends”. Software design is more like a kind of art than technology. It is about aesthetics and your taste of the codeTradeoffs are always there and there is no perfect solution sometimes. Still, there is a general standard (from @shenli, maybe we can call it "better than before?"):

* It is making something better, although not a perfect solution.
* It can mitigate the pain of the user.
* There is no bug introduced by the change itself.

Then the code can be accepted.

Of course, code review should have some minimal requirements.
For a bug fix PR, if there is no test case, ask the coder to add tests.
For a performance PR, if no benchmark result is provided, ask the coder to add a benchmark result.

## 2. What to look for in a code review

### Design

The most important thing to cover in a review is the overall design. Read the description of the PR, if it's not easy to understand, ask the coder to improve it. Does it integrate well with the rest of your system? Is now a good time to add this functionality?

[TiDB Internals forum](https://internals.tidb.io/) is a place for discussion. For pull requests that are created without prior consensus, try to seek consensus there.

### Functionality

Does this PR do what the developer intended? Is what the developer intended good for the users of this code?
Mostly, we expect developers to test PRs well-enough by the time they get to code review. However, as the reviewer you should still be thinking about edge cases, looking for concurrency problems.
You can validate the PR if you want. It’s hard to understand how some changes will impact a user when you’re just reading the code, such as a UI change. You can have the developer give you a demo of the functionality if it’s too inconvenient to try it yourself.

### Logic

When there is some sort of parallel programming going on in the PR, it’s particularly important to think about the logic during a code review. These sorts of issues are very hard to detect by just running the code and usually need somebody to think carefully.
The human brain is just like a special machine, it is good at checking a small piece of logic before the states become too complex. Complexity is the biggest enemy of software.

### Complexity

Is the PR more complex than it should be? Check this at every level of the PR—are individual lines too complex? Are functions too complex? Are classes too complex? “Too complex” usually means “can’t be understood quickly by readers.” It can also mean “developers are likely to introduce bugs when they try to call or modify this code.”

A particular type of complexity is over-engineering, where developers have made the code more generic than it needs to be, or added functionality that isn’t presently needed by the system. Reviewers should be especially vigilant about over-engineering. Encourage developers to solve the problem they know needs to be solved now, not the problem that the developer speculates might need to be solved in the future. 

### Tests

Ask for unit, integration, or end-to-end tests as appropriate for the change. In general, tests should be added in the same PR as the production code.
Make sure that the tests in the PR are correct, sensible, and useful. Are they covering interesting cases? Are they readable? Does the PR lower overall test coverage? 
Think of ways this code could break. Will the tests actually fail when the code is broken? If the code changes beneath them, will they start producing false positives? Does each test make simple and useful assertions? Are the tests separated appropriately between different test methods?

Remember that tests are also code that has to be maintained. Don’t accept complexity in tests just because they aren’t part of the main binary.
Last but not least, keep an eye on how long the single unit takes to run. Does it slow the CI?

### Naming

Did the developer pick good names for everything? A good name is long enough to fully communicate what the item is or does, without being so long that it becomes hard to read.

### Comments

Did the developer write clear comments in understandable English? Are all of the comments actually necessary? Usually comments are useful when they explain why some code exists, and should not be explaining what some code is doing. If the code isn’t clear enough to explain itself, then the code should be made simpler. There are some exceptions (regular expressions and complex algorithms often benefit greatly from comments that explain what they’re doing, for example) but mostly comments are for information that the code itself can’t possibly contain, like the reasoning behind a decision.
It can also be helpful to look at comments that were there before this PR. Maybe there is a TODO that can be removed now, a comment advising against this change being made, etc.
Note that comments are different from documentation of classes, modules, or functions, which should instead express the purpose of a piece of code, how it should be used, and how it behaves when used.

### Style

Make sure the PR follows the appropriate style guides. For Go and Rust, there are built in tools with the compiler toolchain.
If you want to improve some style point that isn’t in the style guide, you can comment that you think it would improve the code readability but isn’t mandatory. Don’t block PRs from being submitted based only on personal style preferences.
The author of the PR should not include major style changes combined with other changes. For example, if the author wants to reformat the whole file, have them send you just the reformatting as one PR, and then send another PR with their functional changes after that. This has been explained as “One PR just does one thing” in the previous section.

### Consistency

What if the existing code is inconsistent with the style guide? The style guide is the absolute authority: if something is required by the style guide, the PR should follow the guidelines.

In some cases, the style guide makes recommendations rather than declaring requirements. In these cases, it’s a judgment call whether the new code should be consistent with the recommendations or the surrounding code. Bias towards following the style guide unless the local inconsistency would be too confusing

If no other rule applies, the author should maintain consistency with the existing code.

Either way, encourage the author to file a bug and add a TODO for cleaning up existing code.

### Documentation

If a PR changes how users build, test, interact with, or release code, check to see that it also updates associated documentation, including READMEs, and any generated reference docs. If the PR deletes or deprecates code, consider whether the documentation should also be deleted. If documentation is missing, ask for it.
Error Handling
Be careful with error or exception handling. This is one of the most common places for bugs. Does the test cover the error code path? Does a panic make the whole process exit for server services? Does the code handle the resource releasing properly? Especially for Go programs involving concurrent goroutines, is there a goroutine leak or memory leak after the error?

Sometimes it is difficult for a real program to run to the error code path, and even more difficult to reproduce and debug if it really happens. Then it is necessary to mock the error code path. Tools like failpoint are available for that purpose.

### Performance

Does the PR impose any performance impact? Sometimes a minor change on the hot path that seems unrelated may still affect performance. Is the algorithm in the PR suitable for that case?

## 3. How to write code review comments

### Be respectful to the reviewees

Good reviewers are empathetic. Your code will always need to be reviewed. And you’ll always need to review your coworkers’ code. When you approach reviews as a learning process, everyone wins.

### Ask questions rather than make statements

Wording is very important. Try to be constructive in your feedback, rather than critical. You can do this by asking questions, rather than making statements. And remember to give praise alongside your constructive feedback.

### Offer sincere praise

Most reviewers focus only on what’s wrong with the code, but they should offer encouragement and appreciation for good practices, as well. It’s sometimes even more valuable, in terms of mentoring, to tell a developer what they did right than to tell them what they did wrong.

For example, imagine you’re reviewing for an author who struggles to write documentation, and you come across a clear, concise function comment. Let them know they nailed it. They will improve faster if you tell them when they got it right instead of just waiting to ding them when they screw up.

Summary

* Be kind to the coder, not to the code.
* Ask questions rather than make statements.
* Treat people who know less than you with respect, deference, and patience.
* Remember to praise when the code quality exceeds your expectation.
* It isn't necessarily wrong if the coder's solution is different from yours.
* Refer to the code style document when necessary.

## 4. Review with the @ti-chi-bot

The TiDB community is using a service called [@ti-chi-bot](https://book.prow.tidb.io/#/en/) to help with the review of the pull requests.

You can see the full list of commands accepted by the bot in [this page](https://prow.tidb.io/command-help?repo=pingcap%2Ftidb).

Here are the most frequent commands you are like gonna use during a review.

* `/cc @reviewer` requests a review from the reviewer.
* `/assign @committer` assigns a committer to help merge the pull request
* GitHub reviewing `Approve` or `Request Changes` from reviewers or committers creates a LGTM or veto to the pull request.
