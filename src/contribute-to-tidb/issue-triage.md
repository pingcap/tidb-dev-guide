# Issue Triage

TiDB uses a issue-centric workflow for development. Every problem, enhancement and feature starts with a issue. For bug issues, you need to perform some more triage operations on the issues.

## Diagnose issue severity

The severity of a bug reflects the level of impact that the bug has on users when they use TiDB. The greater the impact, the higher severity the bug is. For higher severity bugs, we need to fix them faster. Although the impact of bugs can not be exhausted, they can be divided into four levels.

### Critical

The bug affects critical functionality or critical data. It might cause huge losses to users and does not have a workaround. Some typical critical bugs are as follows:

* Invalid query result (correctness issues)
    * TiDB returns incorrect results or results that are in the wrong order for a typical user-written query.
    * Bugs caused by type casts.
    * The parameters are not boundary value or invalid value, but the query result is not correct(except for overflow scenes).
* Incorrect DDL and DML result
    * The data is not written to the disk, or wrong data is written.
    * Data and index are inconsistent.
* Invalid features
    * Due to a regression, the feature can not work in its main workflow
        * Follower can not read follower.
        * SQL hint does not work.
    * SQL Plan
        * Cannot choose the best index. The difference between best plan and chosen plan is bigger than 200%.
    * DDL design
        * DDL process causes data accuracy issue.
    * Experimental feature
        * If the issue leads to another stable feature’s main workflow not work, and may occur on released version, the severity is critical.
        * If the issue leads to data loss, the severity is critical.
    * Exceptions
        * If the feature is clearly labeled as experimental, when it doesn’t work but doesn’t impact another stable feature’s main workflow or only impacts stable feature’s main workflow on master, the issue severity is major.
        * The feature has been deprecated and a viable workaround is available(at most major).
* System stability
    * The system is unavailable for more than 5 minutes(if there are some system errors, the timing starts from failure recovery).
    * Tools cannot perform replication between upstream and downstream for more than 1 minute if there are no system errors.
    * TiDB cannot perform the upgrade operation.
    * TPS/QPS dropped 25% without system errors or rolling upgrades.
    * Unexpected TiKV core dump or TiDB panic(process crashed).
    * System resource leak, include but not limit to memory leak and goroutine leak.
    * System fails to recover from crash.
* Security and compliance issues
    * CVSS score >= 9.0.
    * TiDB leaks secure information to log files, or prints customer data when set to be desensitized.
* Backup or Recovery Issues
    * Failure to either backup or restore is always considered critical.
* Incompatible Issues
    * Syntax/compatibility issue affecting default install of tier 1 application(i.e. Wordpress).
    * The DML result is incompatible with MySQL.
* CI test case fail
    * Test cases which lead to CI failure and could always be reproduced.
* Bug location information
    * Key information is missing in ERROR level log.
    * No data is reported in monitor.

### Major

The bug affects major functionality. Some typical critical bugs are as follow:

* Invalid query result
    * The query gets the wrong result caused by overflow.
    * The query gets the wrong result in the corner case.
        * For boundary value, the processing logic in TiDB is inconsistent with MySQL.
    * Inconsistent data precision.
* Incorrect DML or DDL result
    * Extra or wrong data is written to TiDB with a DML in a corner case.
* Invalid features
    * The corner case of the main workflow of the feature does not work.
    * The feature is experimental, but a main workflow does not work.
    * Incompatible issue of view functionality.
    * SQL Plan
        * Choose sub-optimal plan. The difference between best plan and chosen plan is bigger than 100% and less than 200%
* System stability
    * TiDB panics but process does not exit.
* Less important security and compliance issues
    * CVSS score >= 7.0
* Issues that affects critical functionality or critical data but rare to reproduce(can’t be reproduced in one week, and have no clear reproduce steps)
* CI test cases fail
    * Test case is not stable.
* Bug location information
    * Key information is missing in WARN level log.
    * Data is not accurate in monitor.

### Moderate

* SQL Plan
    * Cannot get the best plan due to invalid statistics.
* Documentation issues
* The bugs were caused by invalid parameters which rarely occurred in the product environment.
* Security issues
    * CVSS score >= 4.0
* Incompatible issues occurred on boundary value
* Bug location information
    * Key information is missing in DEBUG/INFO level log.

### Minor

The bug does not affect functionality or data. It does not even need a workaround. It does not impact productivity or efficiency. It is merely an inconvenience. For example:

* Invalid notification
* Minor compatibility issues
    * Error message or error code does not match MySQL.
    * Issues caused by invalid parameters or abnormal cases.

### Not a bug

The following issues look like bugs but actually not. They should not be tagged "type/bug" and instead be only tagged "type/compatibility":

* Behavior is different from MySQL, but could be argued as correct.
* Behavior is different from MySQL, but MySQL behavior differs between 5.7 and 8.0.

## Identify issue affected releases

For `type/bug` issues, when they are created and identified as `severity/critical` or `severity/major`, the ti-chi-bot will assign a list of `may-affect-x.y` labels to the issue. For example, currently if we have version 5.0, 5.1, 5.2, 5.3, 4.0 and the in-sprint 5.4, when a `type/bug` issue is created and added label `severity/critical` or `severity/major`, the ti-chi-bot will add label `may-affect-4.0`, `may-affect-5.0`, `may-affect-5.1`, `may-affect-5.2`, and `may-affect-5.3`. These labels mean that whether the bug affects these release versions are not yet determined, and is awaiting being triaged. You could check [currently maintained releases list](https://pingcap.github.io/tidb-dev-guide/project-management/release-train-model.html#what-is-tidb-version-mechanism-under-release-train-model) for all releases.

When a version is triaged, the triager needs to remove the corresponding `may-affect-x.y` label. If the version is affected, the triager needs to add a corresponding `affects-x.y` label to the issue and in the meanwhile the `may-affect-x.y` label can be automatically removed by the ti-chi-bot, otherwise the triager can simply remove the `may-affect-x.y` label. So when a issue has a label `may-affect-x.y`, this means the issue has not been diagnosed on version x.y. When a issue has a label `affects-x.y`, this means the issue has been diagnosed on version x.y and identified affected. When both the two labels are missing, this means the issue has been diagnosed on version x.y but the version is not affected.

The status of the affection of a certain issue can be then determined by the combination of the existence of the corresponding `may-affect-x.y` and `affect-x.y` labels on the issue, see the table bellow for a clearer illustration.

| may-affect-x.y | affects-x.y |                         status                                |
|:--------------:|:-----------:|:-------------------------------------------------------------:|
|     YES        |    NO       | version x.y has not been diagnosed                            |
|     NO         |    NO       | version x.y has been diagnosed and identified as not affected |
|     NO         |    YES      | version x.y has been diagnosed and identified as affected     |
|     YES        |    YES      | invalid status                                                |
