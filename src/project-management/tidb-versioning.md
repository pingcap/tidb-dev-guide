# TiDB Versioning 

TiDB versioning has the form `X.Y.Z` where `X.Y` refers to the release series and `Z` refers to the patch number. Starting with TiDB 6.0, TiDB is released as two different release series:

- LTS(Long-Term Support) Releases
- DMR(Development Milestone) Releases

## LTS Releases

LTS releases are made available approximately every six months. They carry new features and improvements and are recommended to deploy into production environments. There will be patch releases based on the LTS releases in their lifecycle. Example versions:

- `5.4`
- `6.1`

Release `4.0` and `5.x` are treated like LTS releases although they are earlier than `6.0`.

## DMR Releases

DMR releases are made available approximately every two months. Every 3rd DMR release turns into a LTS release. Same as LTS releases, a DMR release introduces new features and improvements. But there is no patch releases based on the DMR release. Bugs in the DMR release are going to be fixed in the next DMR/LTS releases. There is a `-DMR` suffix of DMR versioning. Example versions:

- `6.0.0-DMR`
- `6.2.0-DMR`

## Patch Releases

Patch releases generally include bug fixes for LTS releases. There is no fixed release schedule for patch releases. Example versions:

- `6.1.1`
- `6.1.2`

## Historical Versioning

There are some other versioning in history which are not used any more.

### GA(General Availability) Releases

Stable release series, released after RC releases. GA releases are recommended for production usage. Example versions:

- `2.1 GA`
- `5.0 GA`

### RC(Release Candidate) Releases

RC releases introduces new features and improvements and meant for early test. Comparing with Beta releases, RC releases are much more stable and suitable for test, but not suitable for production usage. Example versions:

- `2.0-RC1`
- `3.0.0-rc.1`

### Beta Releases

Beta releases introduces new features and improvements. Comparing with Alpha releases, Beta releases shall not carry any critical bugs. Early adopters could use Beta releases to try new features. Example versions:

- `1.1 Beta`
- `4.0.0-beta.1`

### Alpha Releases

The very first releases in a series. Used for fundamental functionality and performance test. Example versions:

- `1.1 Alpha`
