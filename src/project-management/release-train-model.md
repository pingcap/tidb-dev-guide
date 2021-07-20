# Release Train Model

## What is release train model?

Before v5.0, TiDB releases a major version every year or every half year.

However, the longer a development cycle is, the more features it is responsible to deliver, which is hard to coordinate when doing regression and acceptance tests and releasing, and thus delay happens.

Also, new feature requests occur during the development cycle, and due to the long development cycle, new feature requests are added as development backlog after the development cycle started. In this case, development tasks can hardly converge until it is closed to release date.

Starting from v5.0, TiDB adopts the release train model. Release train model is a product development model for requirements gathering, analysis, decision making, release, and issue feedback.

Just like a train delivering goods, decisions need to be made about the priority of the goods, destination, arrival time, which train to load on, which carriage, etc., before the train departs.

The benefits of moving to the release train model are:

1. A quicker feedback cycle and users can benefit from features shipped quicker.
2. Predictability for contributors and users:
    1. Developers and reviewers can decide in advance what release they are aiming for with specific features.
    2. If a feature misses a release train we have a good idea of when it will show up.
    3. Users know when to expect their features
3. Transparency. There will be a published cut-off date (AKA code freeze) for the release and people will know about it in advance. Hopefully this will remove the contention around which features make it.
4. Quality. we've seen issues pop up in release candidates due to last-minute features that didn't have proper time to bake in. More time between code freeze and release will let us test more, document more and resolve more issues.
5. Project visibility and activity. Having frequent releases improves our visibility and gives the community more opportunities to talk about TiDB.

Since nothing is ever perfect, there will be some downsides:

1. Most notably, features that miss the code-freeze date for a release will have to wait few months for the next release train. Features will reach users faster overall as per benefit #1, but individual features that just miss the cut will lose out.
2. For users, figuring out which release to use and having frequent new releases to upgrade to may be a bit confusing.
3. Frequent releases mean we need to do bugfix releases for older branches.

We decided to experiment with release train model and see if the benefits for us as a community exceed the drawbacks. 

## How will TiDB development process look like?

At this stage we are planning to make a release every two months.

Thus, a typical development cycle takes two months, which we call a sprint. For example, the development cycle of v5.2 is from the end of June to the end of August and called Sprint 4.

Two weeks before the release date, the release manager will cut branches, publish a list of features that will be included in the release, and also announce code-freeze, after which only fixes for blocking bugs will be merged. This announcement will be posted on the [TiDB Internals forum](https://internals.tidb.io/).

For release train model, we will strictly ensure that a release happens on a given date. For example, in the release of v5.2, we will decide to have a release by the end of August and we will stick to it. We will drop features that we think will not make it into the release at the time of code freeze and also avoid taking on new features into the release branch. Master development can continue as usual and those features will be in the following release. 

Ideally, we would have started stabilization around this time. After code freeze, pull requests to the release branch will be merged only if any blocker bugs are identified. In a rare scenario, we could end up with a feature that passed the code freeze bar but still fails to complete on time. Such features will also be dropped from the release at the end to meet the release deadline.

## What happens if features don't complete?

Features tend to be of different complexity. Some of them can be implemented within a single release while some span multiple releases. With release train model, we would need to ensure that ongoing features do not affect the stability of the release. There are couple of options -

1. Ensure that every feature is broken down into testable units and only testable units get checked in. This means that good set of unit test and system tests are written for sub tasks before they are checked in. This will ensure that master is in a relatively stable state to release at any point of time.

2. Use feature branches. Create branches from master that are focused on a specific feature. The feature developers ensure that the branch is in sync with master from time to time. Once there is high level of confidence on the stability, it can be merged into master. This approach has the additional overhead of branching and performing merges from time to time.

In practice, the right approach would be a mix of both. The feature developers need to make this call depending on the complexity of the feature.
