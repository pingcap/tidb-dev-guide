# Release Train Model

## What is the release train model?

Before introducing the concept of the release train model, let us take a review of the delivery mode of TiDB in the past.

In releases earlier than v5.0, the release frequency of TiDB major versions was a year or half a year, which is quite a long development cycle. The long development cycle has both benefits and drawbacks as follows:

- Benefits: the longer a development cycle is, the more features one release can deliver.
- Drawbacks: the longer a development cycle is, the more difficulties we have to coordinate regression and acceptance tests, and the more possibly a delay happens. Also, if new feature requests are received during the long development cycle, these new features are added to the development backlog after the start of the development cycle. In this case, development tasks are hardly converged before the release date.

Starting from v5.0, TiDB adopts the release train model, which is a product development model for requirements gathering, analysis, decision making, release, and issue feedback.

Just like a train delivering goods, decisions need to be made about the priorities of the goods, destination, arrival time, which train to load on, which carriage, etc., before the train departs.

The benefits of moving to the release train model are as follows:

1. A shorter feedback cycle: users can benefit from features shipped faster.
2. Easier predictability for contributors and users:
    1. Developers and reviewers can decide in advance the target release to deliver specific features.
    2. If a feature misses a release train, we have a good idea of when the feature will show up later.
    3. Users know when to expect their features.
3. Transparency. There will be a published cut-off date (AKA code freeze) for the release and people will know about the date in advance. Hopefully this will remove the contention around which features will be included in the release.
4. Quality. we've seen issues pop up in release candidates due to last-minute features that didn't have proper time to bake in. More time between code freeze and release will let us test more, document more and resolve more issues.
5. Project visibility and activity. Having frequent releases improves our visibility and gives the community more opportunities to talk about TiDB.

Because nothing is ever perfect, the release train model has some downsides as well:

1. Most notably, for features that miss the code-freeze date for a release, we have to wait for a few months to catch the next release train. Most features will reach users faster as per benefit #1, but it is possible that a few features missing the code-freeze date might lose out.
2. With the frequent releases, users need to figure out which release to use. Also, having frequent new releases to upgrade may be a bit confusing.
3. Frequent releases means more branches. To fix a bug of an old release, we need to work on more old branches.

We decided to experiment with release train model and see if the benefits for us as a community exceed the drawbacks. 

## How will TiDB development process look like?

At this stage we are planning to make a release every two months.

Thus, a typical development cycle takes two months, which we call a sprint. For example, the development cycle of v5.2 is from the end of June to the end of August and is called Sprint 4.

Two weeks before the release date, the release manager will create a branch for the new release based on the master branch, publish a list of features to be included in the release, and also announce the code-freeze, after which only fixes for blocking bugs can be merged.

For the release train model, we strictly ensure that a release happens on the planned date. For example, we decide to deliver the v5.2 release by the end of August so we will stick to it. If any features cannot be completed by the code-freeze date, we will drop them and avoid taking them into the new release branch. In this case, the development in the master branch can still work as usual and those features will be moved to the following release. 

Ideally, we would have started stabilization once we create the new release branch. After the code-freeze date, only pull requests of blocker bugs can be merged to the new release branch. In a rare scenario, it is possible that few features pass the code freeze bar but still fail to be completed on time. Such features will also be dropped from the release train in the end to meet the release deadline.

## What is TiDB version mechanism under release train model?

Under release train model, every sprint we produce one new release. The version of the release is vx.x.0, short as vx.x. Such version carries all the new features and bug fixes. Versions like vx.x.1 are bugfix versions, they won't accept any new features and are scheduled only when needed. The current maintained versions are:

| version             | branch             | status            | triage label            | lastest release          | issue 
|:--------------------|:-------------------|:------------------|:------------------------|:-------------------------|:-------------------------------------------------------
| v5.4                | master             | in sprint         |                         |                          | https://github.com/pingcap/tidb/issues/30336
| v5.0                | release-5.0        | bugfix            | affect-5.0              | v5.0.5                   | https://github.com/pingcap/tidb/issues/30228
| v5.1                | release-5.1        | bugfix            | affect-5.1              | v5.1.3                   | https://github.com/pingcap/tidb/issues/30227
| v5.2                | release-5.2        | bugfix            | affect-5.2              | v5.2.3                   | https://github.com/pingcap/tidb/issues/30226
| v5.3                | release-5.3        | bugfix            | affect-5.3              | v5.3.0                   | https://github.com/pingcap/tidb/issues/28378
| v4.0                | release-4.0        | bugfix            | affect-4.0              | v4.0.15                  | https://github.com/pingcap/tidb/issues/27800

For more versions' information, please check https://github.com/pingcap/tidb/projects/63.

## What happens if features are not completed?

Different features have different complexities. Some features can be implemented within a single release while some features span multiple releases. With the release train model, to ensure that ongoing features do not affect the stability of the release, we have two approaches as follows:

1. Ensure that each feature is split into testable units and only testable units get merged. This means that a good set of unit tests and system tests are written for sub-tasks before they are merged. This approach ensures that the master branch is in a relatively stable state and can be released at any time.

2. Use feature branches. For a specific feature, the feature developers create a branch from the master branch and ensure that the branch is in sync with the master branch from time to time. Only when the feature developers and reviewers have a high level of confidence in the feature stability, the feature can be merged into master. This approach brings the additional overhead of branching and performing merges from time to time.

In practice, the right approach can be a mix of both. The feature developers need to make the decision depending on the complexity of the feature.
