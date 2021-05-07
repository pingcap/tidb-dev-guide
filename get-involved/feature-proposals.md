# Feature Proposals

## Motivation

Many changes, including bug fixes and documentation improvements can be implemented and reviewed via the normal GitHub pull request workflow.

Some changes though are "substantial", and we ask that these be put through a bit of a design process and produce a consensus among the TiDB community.

The process described in this page is intended to provide a consistent and controlled path for new features to enter the TiDB projects, so that all stakeholders can be confident about the direction the projects is evolving in.

## Who should initiate the design document?

Everyone is encouraged to initiate a design document, but before doing it, please make sure you have an intention of getting the work done to implement it.

## Before creating a design document

A hastily-proposed design document can hurt its chances of acceptance. Low-quality proposals, proposals for previously-rejected features, or those that don't fit into the near-term RoadMap, may be quickly rejected, which can be demotivating for the unprepared contributor. Laying some groundwork ahead of the design document can make the process smoother.

Although there is no single way to prepare for submitting a design document, it is generally a good idea to pursue feedback from other project developers beforehand, to ascertain that the design document may be desirable; having a consistent impact on the project requires concerted effort toward consensus-building.

The most common preparations for writing and submitting an design document for now is posting a topic on the [TiDB Internals forum](https://internals.tidb.io/) with "PROPOSAL" prefix.

## What is the process?

1. Create a pull request with a design document based on the [template](https://github.com/pingcap/tidb/blob/ff689c08aa1ac3d06038be2332be548889286b98/docs/design/TEMPLATE.md) under the [design document directory](https://github.com/pingcap/tidb/tree/master/docs/design) as `YYYY-MM-DD-my-feature.md`.
2. Discussion takes place, and the text is revised in response.
3. The design document is accepted or rejected when at least two committers reach consensus and no objection from the committer.
4. If accepted, [create a tracking issue](https://github.com/pingcap/tidb/issues/new/choose) for the design document. The tracking issue basically tracks subtasks and progress. And refer the tracking issue in the design document replacing placeholder in the template.
5. Merge the pull request of design.

Please update the tracking issue according to the progress of succeeding implementation pull requests.

An example that almost fits into this model is the proposal "Support global index for partition table", without following the latest template.

- Its tracking issue: https://github.com/pingcap/tidb/issues/18032
- Its pull request: https://github.com/pingcap/tidb/pull/18982
- Its design document: https://github.com/pingcap/tidb/blob/ff689c08aa1ac3d06038be2332be548889286b98/docs/design/2020-08-04-global-index.md