# Review a Pull Request

TiDB values any [code review](https://en.wikipedia.org/wiki/Code_review). One of the bottlenecks in the TiDB development process is the lack of code reviews. If you browse the issue tracker, you will see that numerous issues have a fix, but cannot be merged into the main source code repository, because no one has reviewed the proposed solution. Reviewing a pull request can be just as informative as providing a pull request and it will allow you to give constructive comments on another developer's work. It is a common misconception that in order to be useful, a code review has to be perfect. This is not the case at all! It is helpful to just test the pull request and/or play around with the code and leave comments in the pull request.

## Principles of the code review

* Technical facts and data overrule opinions and personal preferences.
* Software design is about trade-offs, and there is no silver bullet.

Everyone comes from different technical backgrounds with different knowledge. They have their own personal preferences. It is important that the code review is not based on biased opinions.

Sometimes, making choices of accepting or rejecting a pull request can be tricky as in the following situations: 

* Suppose that a pull request contains special optimization that can improve the overall performance by 30%. However, the pull request introduces a totally different code path, and every subsequent feature must consider it.
* Suppose that a pull request is to fix a critical bug, but the change in the pull request is risky to introduce other bugs.

If a pull request under your review is in these tricky situations, what is the right choice, accepting the pull request or rejecting it? The answer is always "it depends." Software design is more like a kind of art than technology. It is about aesthetics and your taste of the code. There are always trade-offs, and often there's no perfect solution.

## Triaging pull requests

Some pull request authors may not be familiar with TiDB, TiDB development workflow or TiDB community. They don't know what labels should be added to the pull requests and which experts could be asked for review. If you are able to, it would be great for you to triage the pull requests, adding suitable labels to the pull requests, asking corresponding experts to review the pull requests. These actions could help more contributors notice the pull requests and make quick responses.

## Checking pull requests

There are some basic aspects to check when you review a pull request:

* **Concentration**. One pull request should only do one thing. No matter how small it is, the change does exactly one thing and gets it right. Don't mix other changes into it.
* **Tests**. A pull request should be test covered, whether the tests are unit tests, integration tests, or end-to-end tests. Tests should be sufficient, correct and don't slow down the CI pipeline largely.
* **Functionality**. The pull request should implement what the author intends to do and fit well in the existing code base, resolve a real problem for TiDB users. To get the author's intention and the pull request design, you could follow the discussions in the corresponding GitHub issue or [internal.tidb.io](https://internals.tidb.io) topic.
* **Style**. Code in the pull request should follow common programming style. For Go and Rust, there are built-in tools with the compiler toolchain. However, sometimes the existing code is inconsistent with the style guide, you should maintain consistency with the existing code or file a new issue to fix the existing code style first.
* **Documentation**. If a pull request changes how users build, test, interact with, or release code, you must check whether it also updates the related documentation such as READMEs and any generated reference docs. Similarly, if a pull request deletes or deprecates code, you must check whether or not the corresponding documentation should also be deleted.
* **Performance**. If you find the pull request may affect performance, you could ask the author to provide a benchmark result.

## Writing code review comments

When you review a pull request, there are several rules and suggestions you should take to [write better comments](https://docs.github.com/en/github/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request):

* **Be respectful to pull request authors and other reviewers**. Code review is a part of your community activities. You should follow the community requirements.
* **Asking questions instead of making statements**. The wording of the review comments is very important. To provide review comments that are constructive rather than critical, you can try asking questions rather than making statements.
* **Offer sincere praise**. Good reviewers focus not only on what is wrong with the code but also on good practices in the code. As a reviewer, you are recommended to offer your encouragement and appreciation to the authors for their good practices in the code. In terms of mentoring, telling the authors what they did is right is even more valuable than telling them what they did is wrong.
* **Provide additional details and context of your review process**. Instead of simply "approving" the pull request. If your test the pull request, report the result and your test environment details. If you request changes, try to suggest how.

## Accepting pull requests

Once you think the pull request is ready, you can [approve](https://docs.github.com/en/github/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews) it. 

In the TiDB community, most repositories require two approvals before a pull request can be accepted. A few repositories require a different number of approvals, but two approvals are the default setting. After the required approval number is met, a committer can [/merge](https://prow.tidb.io/command-help?repo=pingcap%2Ftidb#merge) the pull request.
