# Async Commit

Async commit is an optimization of two phase commit introduced in TiDB 5.0. The optimization greatly reduces the latency of the two phase commit process.

This document talks about the implementation of async commit in TiDB. It is recommended that you have learned about the [theories of async commit](https://en.pingcap.com/blog/async-commit-the-accelerator-for-transaction-commit-in-tidb-5.0) first.

This document refers to the code of [TiDB v5.2.1](https://github.com/pingcap/tidb/tree/v5.2.1), the corresponding [client-go](https://github.com/tikv/client-go/tree/daddf73a0706d78c9e980c91c97cc9ed100f1919) and [TiKV v5.2.1](https://github.com/tikv/tikv/tree/v5.2.1).

## TiDB part

### Preparations

Async commit does not change the behavior during transaction execution. The changes begin from [2PC execution](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/2pc.go#L1112).

Because we need to record the key list in the primary lock, it is not suitable to use the async commit protocol for large transactions. And binlog does not support async commit, so we disable async commit if binlog is enabled. These checks can be found [here](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/2pc.go#L999).

And in the [theory blog](https://en.pingcap.com/blog/async-commit-the-accelerator-for-transaction-commit-in-tidb-5.0), we proves that using a latest timestamp from PD can guarantee linearizability. You can find the code [here](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/2pc.go#L1191). Actually, it is not always necessary to get this timestamp, the comment [here](https://github.com/pingcap/tidb/blob/v5.2.1/session/session.go#L559) explains it:

```go
// priority of the sysvar is lower than `start transaction with causal consistency only`
if val := s.txn.GetOption(kv.GuaranteeLinearizability); val == nil || val.(bool) {
    // We needn't ask the TiKV client to guarantee linearizability for auto-commit transactions
    // because the property is naturally holds:
    // We guarantee the commitTS of any transaction must not exceed the next timestamp from the TSO.
    // An auto-commit transaction fetches its startTS from the TSO so its commitTS > its startTS > the commitTS
    // of any previously committed transactions.
    s.txn.SetOption(kv.GuaranteeLinearizability,
                    sessVars.TxnCtx.IsExplicit && sessVars.GuaranteeLinearizability)
}
```

Later, we also calculate a `maxCommitTS`. This will be discussed later in the DDL compatibility part.

### Prewrite

If we decide to use async commit, we need to provide some [extra information](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/prewrite.go#L131) to enable the async commit protocol, the `UseAsyncCommit` flag and the secondary keys:

```go
req := &kvrpcpb.PrewriteRequest{/* ommitted */}
if c.isAsyncCommit() {
    if batch.isPrimary {
        req.Secondaries = c.asyncSecondaries()
    }
    req.UseAsyncCommit = true
}
```

If the [prewriting succeeds](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/prewrite.go#L292), there are two cases.

If TiKV cannot proceed the async-commit protocol successfully, (probably because the calculated commit TS exceeds `maxCommitTS`), we fallback to the traditional percolator protocol. Otherwise, the prewrite request succeeds, so we can update the global `MinCommitTS`.

```go
// 0 if the min_commit_ts is not ready or any other reason that async
// commit cannot proceed. The client can then fallback to normal way to
// continue committing the transaction if prewrite are all finished.
if prewriteResp.MinCommitTs == 0 {
    c.setAsyncCommit(false)
} else {
    c.mu.Lock()
    if prewriteResp.MinCommitTs > c.minCommitTS {
        c.minCommitTS = prewriteResp.MinCommitTs
    }
    c.mu.Unlock()
}
```

However, if any response of prewrite is finally lost due to RPC reasons, it is impossible for us to know whether the prewriting succeeds. And it also means we cannot know whether the transaction succeeds. In this case, we can only [return an "undetermined error"](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/prewrite.go#L187) and the client connection will be closed:

```go
defer func() {
    if err != nil {
        // If we fail to receive response for async commit prewrite, it will be undetermined whether this
        // transaction has been successfully committed.
        // If prewrite has been cancelled, all ongoing prewrite RPCs will become errors, we needn't set undetermined
        // errors.
        if (c.isAsyncCommit() || c.isOnePC()) && sender.GetRPCError() != nil && atomic.LoadUint32(&c.prewriteCancelled) == 0 {
            c.setUndeterminedErr(errors.Trace(sender.GetRPCError()))
        }
    }
}()
```

But don't worry, this does not happen very often. It is safe to retry a prewrite which temporarily fails due to network reasons. The above problem only happens if a prewrite request has been sent, but later retries all fail due to RPC errors.

### Commit

The whole commit process is [done asynchronously in background](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/2pc.go#L1370). This is why the optimization is called "async commit":

```go
if c.isAsyncCommit() {
    // For async commit protocol, the commit is considered success here.
    c.txn.commitTS = c.commitTS
    go func() {
        commitBo := retry.NewBackofferWithVars(c.store.Ctx(), CommitSecondaryMaxBackoff, c.txn.vars)
        c.commitMutations(commitBo, c.mutations)
    }()
    return nil
}
```

It does not matter even if some temporary error happens in the commit process. Anyone who encounters these uncommitted async-commit locks is able to finally commit them. Next, we will talk about this.

### Transaction recovery

If a reader encounters an expired async-commit lock, it needs to resolve this lock.

As usual, the primary lock is checked first to get the transaction information. If it is using the async-commit protocol, the primary lock is never cleaned in `CheckTxnStatus`. Then we call the [`resolveLockAsync` function](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/txnlock/lock_resolver.go#L732) to resolve this transaction.

First, it checks all secondary locks. After that we should know the commit TS of this transaction. If all locks exist or some key has been committed, we can calculate a real commit TS. And if some lock does not exist, the commit TS is zero which indicates the transaction should be rolled back.

```go
resolveData, err := lr.checkAllSecondaries(bo, l, &status)
if err != nil {
    return err
}
status.commitTS = resolveData.commitTs
```

Then we can use this commit TS to resolve all the locks in this transaction.

Another case is when the transaction is actually not an async-commit transaction. Some keys are prewritten with the async-commit protocol while some keys fail and fallback. Such a case can be [detected](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/txnlock/lock_resolver.go#L674) when checking secondary locks:

```go
if !lockInfo.UseAsyncCommit {
    return &nonAsyncCommitLock{}
}
```

And then, we will [retry the lock resolving process](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/txnlock/lock_resolver.go#L341) assuming the transaction is not an async-commit transaction. And now, `CheckTxnStatus` can clean up an expired primary lock:

```go
if _, ok := errors.Cause(err).(*nonAsyncCommitLock); ok {
    err = resolve(l, true)
}
```

### DDL compatibility

Without async commit, we check whether the schema changes before the second phase of the commit. But as the transaction is committed after prewriting all the locks, we don't have the chance to check the schema version. Here we use a trick to work around the problem.

For DDLs which involve data reorganizations, we [delay](https://github.com/pingcap/tidb/blob/cd8fb24c5f7ebd9d479ed228bb41848bd5e97445/ddl/ddl.go#L691) 3 seconds by default. Then, before doing 2PC, we [set `MaxCommitTS`](https://github.com/tikv/client-go/blob/daddf73a07/txnkv/transaction/2pc.go#L1625) to 2 seconds later from now:

```go
func (c *twoPhaseCommitter) calculateMaxCommitTS(ctx context.Context) error {
	// Amend txn with current time first, then we can make sure we have another SafeWindow time to commit
	currentTS := oracle.ComposeTS(int64(time.Since(c.txn.startTime)/time.Millisecond), 0) + c.startTS
	_, _, err := c.checkSchemaValid(ctx, currentTS, c.txn.schemaVer, true)
	if err != nil {
		return errors.Trace(err)
	}

	safeWindow := config.GetGlobalConfig().TiKVClient.AsyncCommit.SafeWindow
	maxCommitTS := oracle.ComposeTS(int64(safeWindow/time.Millisecond), 0) + currentTS

	c.maxCommitTS = maxCommitTS
	return nil
}
```

Therefore, all async-commit transaction using the old schema should be committed before DDL reorganization happens. So, the DDL reorganization will not miss these data.

## TiKV part

### Concurrency manager

As discussed in the [theory blog](https://en.pingcap.com/blog/async-commit-the-accelerator-for-transaction-commit-in-tidb-5.0), TiKV needs to record the max TS and set some memory locks for ongoing prewrite requests.

For simplicity, we use a global component to implement it. We call it the "concurrency manager".

The methods provided by the concurrency manager can be found in [this file](https://github.com/tikv/tikv/blob/v5.2.1/components/concurrency_manager/src/lib.rs).

It is very easy to update the max TS. It's just an atomic operation:

```rust
pub fn update_max_ts(&self, new_ts: TimeStamp) {
    if new_ts != TimeStamp::max() {
        self.max_ts.fetch_max(new_ts.into_inner(), Ordering::SeqCst);
    }
}
```

It is a bit complex for memory locks.

The memory locks can have multiple accessors. Of course, the first one is the prewrite process. And because all readers need to check the memory locks, they are accessors of the memory locks, too. The locks can be removed from the table when there are no accessors.

So the memory table just owns a weak reference to the lock. We define the table like this:

```rust
pub struct LockTable(pub Arc<SkipMap<Key, Weak<KeyHandle>>>);
```

To add a memory lock and be able to write lock information, the `lock_key` method needs to be called to get a lock guard. The locking process is a bit tricky to handle various possiblities in the multi-thread environment. If interested, you can refer to [the code](https://github.com/tikv/tikv/blob/v5.2.1/components/concurrency_manager/src/lock_table.rs#L22) for details.

### Prewrite

The code of prewrite can be found [here](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/prewrite.rs#L405). We will talk about some key points in the code about async commit.

In TiKV, `secondary_keys` and `try_one_pc` in the prewrite request are used to [determine the type]() of the prewrite:

```rust
let commit_kind = match (&self.secondary_keys, self.try_one_pc) {
    (_, true) => CommitKind::OnePc(self.max_commit_ts),
    (&Some(_), false) => CommitKind::Async(self.max_commit_ts),
    (&None, false) => CommitKind::TwoPc,
};
```

Only when prewriting the primary lock, secondary locks need to be written in the lock:

```rust
let mut secondaries = &self.secondary_keys.as_ref().map(|_| vec![]);
if Some(m.key()) == async_commit_pk {
    secondaries = &self.secondary_keys;
}
```

In the prewrite action, async commit does not change the checks. What is different is in the [`write_lock` function](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/actions/prewrite.rs#L367).

Besides setting secondary keys in the primary lock, it calls [`async_commit_timestamps`](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/actions/prewrite.rs#L367) to set `min_commit_ts` in the lock.

Here is the simplified code:

```rust
let final_min_commit_ts = key_guard.with_lock(|l| {
    let max_ts = txn.concurrency_manager.max_ts();

    let min_commit_ts = cmp::max(cmp::max(max_ts, start_ts), for_update_ts).next();
    let min_commit_ts = cmp::max(lock.min_commit_ts, min_commit_ts);

    let max_commit_ts = max_commit_ts;
    if (!max_commit_ts.is_zero() && min_commit_ts > max_commit_ts) {
        return Err(ErrorInner::CommitTsTooLarge {
            start_ts,
            min_commit_ts,
            max_commit_ts,
        });
    }

    lock.min_commit_ts = min_commit_ts;
    *l = Some(lock.clone());
    Ok(min_commit_ts)
})?;

txn.guards.push(key_guard);
```

The final `min_commit_ts` is set to the maximum of (max TS + 1) and the original `min_commit_ts`. And if the `min_commit_ts` is greater than `max_commit_ts`, a `CommitTsTooLarge` is returned and triggers a fallback to non-async commit.

The operation is done while locked to guarantee the atomicity of getting the max TS and setting the `min_commit_ts` in the lock.

The key guard is saved until the lock is successfully written into RocksDB. Before that, readers are able to check the locks in order not to break any constraint. We can release the guard to remove the lock in the memory table after the readers can read the lock from the RocksDB.

#### Fallback to non-async commit

The client may provide a `max_commit_ts` constraint. If the calculated `min_commit_ts` is larger than the `max_commit_ts`, we need to fallback to non-async commit. 

When the `CommitTsTooLarge` error happens, the lock will still be written, but in the lock [there will be no `use_async_commit` flag](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/actions/prewrite.rs#L406) and no secondary keys will be recorded:

```rust
if let Err(Error(box ErrorInner::CommitTsTooLarge { .. })) = &res {
    lock.use_async_commit = false;
    lock.secondaries = Vec::new();
}
```

After any key encounters this error, we [don't need to do async commit prewrite](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/prewrite.rs#L501) for later keys:

```rust
 Err(MvccError(box MvccErrorInner::CommitTsTooLarge { .. })) | Ok((..)) => {
    // fallback to not using async commit or 1pc
    props.commit_kind = CommitKind::TwoPc;
    async_commit_pk = None;
    self.secondary_keys = None;
    // release memory locks
    txn.guards = Vec::new();
    final_min_commit_ts = TimeStamp::zero();
}
```

When any key in a transaction fallbacks to non-async commit mode, the transaction will be considered as a non-async commit transaction.

### Memory lock checking

All transactional reading requests need to update max TS and check memory locks. If the `min_commit_ts` of the lock is not larger than the snapshot timestamp of the reading, it is not safe to proceed this read. Then, an error will be returned and the client needs to retry later.

Here is [an example](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/mod.rs#L1808) in the storage module:

```rust
// Update max_ts and check the in-memory lock table before getting the snapshot
if !pb_ctx.get_stale_read() {
    concurrency_manager.update_max_ts(start_ts);
}
let isolation_level = pb_ctx.get_isolation_level();
if isolation_level == IsolationLevel::Si {
    for key in keys.clone() {
        concurrency_manager
            .read_key_check(key, |lock| {
                Lock::check_ts_conflict(Cow::Borrowed(lock), key, start_ts, bypass_locks)
            })
            .map_err(|e| txn::Error::from_mvcc(e))?;
    }
}
```

### Check transaction status

We use `CheckTxnStatus` to get the status of the primary lock and use `CheckSecondaryLocks` for secondary locks.

In `CheckTxnStatus`, we cannot remove the primary lock simply because it is expired because the transaction may have prewritten all the locks. So we always just return the lock information for async commit locks:

```rust
if lock.use_async_commit {
    if force_sync_commit {
        // The fallback case
    } else {
        return Ok((TxnStatus::uncommitted(lock, false), None));
    }
}
```

The idea of `CheckSecondaryLocks` is simple. If any lock in the list of secondary keys does not exist, remove the lock and write rollback if necessary. And if any lock has been committed, the transaction is committed. You can refer to [its implementation](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/check_secondary_locks.rs#L54) for details.

### Update max TS on region changes

In TiKV, we must guarantee that when a key is prewritten using the async-commit protocol, all readings at this key have updated the max TS. Now we update the max TS on the local TiKV. But there are some other cases we missed. If the reading happens on other TiKVs, then the region leader is transfered to the current TiKV or the region is merged into a region whose leader is on this TiKV, the max TS can be incorrect.

So, for safety, we choose to get a latest timestamp from PD when a region [becomes leader](https://github.com/tikv/tikv/blob/v5.2.1/components/raftstore/src/store/peer.rs#L1391) or a region [is merged](https://github.com/tikv/tikv/blob/v5.2.1/components/raftstore/src/store/fsm/peer.rs#L2992).

Before the max TS is updated, the corresponding region is not allowed to proceed an async-write prewrite. The property is checked [here](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/prewrite.rs#L364).

