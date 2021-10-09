# 1PC

Along with async commit, there is another optimization for transactions, namely 1PC. That is, for transactions that all keys can be Prewritten in a single *prewrite* request to TiKV, we can commit it immediately while prewritting, skipping the second phase (the *commit* phase) completely. This reduces latency and improves throughput in the scenarios where there are many small and simple transactions.

Before working on development related to 1PC, it's recommended to understand how 1PC (as well as async commit) works, and how async commit is implemented (since 1PC is implemented based on async commit). It's recommended to read these two articles first, and this article assumes you already know about them:
* [This article](https://en.pingcap.com/blog/async-commit-the-accelerator-for-transaction-commit-in-tidb-5.0) is a great material to learn about the overall idea of async commit and 1PC.
* [This article](async-commit.md) explains the code related to async commit.

## RPC Protocol

A few additional fields to the `Prewrite` RPC messages is needed for 1PC.

```protobuf
message PrewriteRequest {
    // ...
    bool try_one_pc = 13;
    uint64 max_commit_ts = 14;
}

message PrewriteResponse {
    // ...
    uint64 one_pc_commit_ts = 4;
}
```

* The `try_one_pc` field in the request is to tell TiKV that when handling the prewrite request, it needs to try to commit it directly in 1PC if possible.
* The `max_commit_ts` is used by 1PC and async commit in common. It limits the maximum allowed commit ts. It's related to a mechanism to avoid a transaction commits while schema changed between the transaction's start_ts and commit_ts. This is mechanism is already explained in the [article about async commit](async-commit.md#ddl-compatibility).
* When TiKV successfully commits a transaction in 1PC, the `one_pc_commit_ts` field in the `PrewriteResponse` will be set to tell TiDB the final commit_ts. Sometimes TiKV may fail to commit the transaction by 1PC, but it's able to prewrite it in normal 2PC way. In this case the `one_pc_commit_ts` will be zero to indicate that TiDB still need to proceed on the 2PC procedure (i.e. the commit phase of 2PC).

<!-- ## Configurations

1PC can be enabled or disabled by [the system variable `tidb_enable_1pc`](https://github.com/pingcap/tidb/blob/af70762cd52519f025daa5e869ba37465a7fb311/sessionctx/variable/sysvar.go#L1679-L1682), which is the same as async commit. When the transaction is committing, the configuration will be passed from `session` to `tikvTxn` ([here](https://github.com/pingcap/tidb/blob/af70762cd52519f025daa5e869ba37465a7fb311/session/session.go#L547)) and then to [`KVTxn` in client-go](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/txn.go#L253-L255). -->

## TiDB Part

Based on the implementation of normal 2PC and async commit, there isn't too much additional code to support 1PC, but the code changes are scattered.

The core of 2PC logic is in `twoPhaseCommitter`, and the entry is the [`execute` method](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/2pc.go#L1115). You might already know about it from previous articles. But since the path from the `execute` function to sending RPC requests is quite complicated, let's see how the overall control flow looks like:

* `execute`
    * ⭐ `checkOnePC`
    * `prewriteMutations`
        * `doActionOnMutations`
            * ⭐ `checkOnePCFallBack`
            * `doActionOnGroupMutations`
                * Divide mutations into batches
                * ⭐ `checkOnePCFallBack` 
                * `doActionOnBatches`
                    * `actionPrewrite`.`handleSingleBatch`
                        * `buildPrewriteRequest`
                        * `SendReq`
                        * ⭐ Error handling (maybe fallback, maybe retry `doActionOnMutations` recursively)
        * If not committed in 1PC, continue 2PC or async commit procedure.

The starred items are the ones we are interested in in this article.

### Checking if 1PC Can Be Used

In the `execute` method, it checks if 1PC can be used just after checking async commit, before performing any crucial part of the transaction procedure:

```go
func (c *twoPhaseCommitter) checkOnePC() bool {
    // Disable 1PC in local transactions. This is about another feature that's not compatible with
    // async and 1PC, where transactions have two different "scopes" namely Global and Local.
    if c.txn.GetScope() != oracle.GlobalTxnScope {
        return false
    }

    return !c.shouldWriteBinlog() && c.txn.enable1PC // `txn` is the `KVTxn` object and the value of
                                                     // `enable1PC` is passed from Session previously.
}

func (c *twoPhaseCommitter) execute(ctx context.Context) (err error) {
    // ...

    // Check if 1PC is enabled.
    if c.checkOnePC() {
        commitTSMayBeCalculated = true
        c.setOnePC(true)
        c.hasTriedOnePC = true
    }

    // ...
}
```

Same as async commit, 1PC can't be enabled when using TiDB-Binlog.

Note that we still don't know how many prewrite requests this transaction needs. It will be checked later.

Also note that the `checkOnePC` function doesn't check the transaction's size like how async commit does. Actually, the transaction size is implicitly limited when the keys are divided into batches during prewrite phase. 

The logic then goes to the `prewriteMutation` function from [here](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/2pc.go#L1222), which then calls [the `doActionOnMutations` function](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/2pc.go#L563):

```go
func (c *twoPhaseCommitter) doActionOnMutations(bo *retry.Backoffer, action twoPhaseCommitAction, mutations CommitterMutations) error {
	if mutations.Len() == 0 {
		return nil
	}
	groups, err := c.groupMutations(bo, mutations)
	if err != nil {
		return errors.Trace(err)
	}

	// This is redundant since `doActionOnGroupMutations` will still split groups into batches and
	// check the number of batches. However we don't want the check fail after any code changes.
	c.checkOnePCFallBack(action, len(groups))

	return c.doActionOnGroupMutations(bo, action, groups)
}
```

This function divides the mutations by regions, which means, mutations to keys that belongs to the same region are grouped together. Then it calls [the `doActionOnGroupMutations` function](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/2pc.go#L690):

```go
func (c *twoPhaseCommitter) doActionOnGroupMutations(bo *retry.Backoffer, action twoPhaseCommitAction, groups []groupedMutations) error {
	// ...

	batchBuilder := newBatched(c.primary())
	for _, group := range groups {
		batchBuilder.appendBatchMutationsBySize(group.region, group.mutations, sizeFunc, txnCommitBatchSize)
	}
	firstIsPrimary := batchBuilder.setPrimary()

	// ...

	c.checkOnePCFallBack(action, len(batchBuilder.allBatches()))

    // ...
```

`doActionOnGroupMutations` divides each group into multiple batches if the group has too many keys.

Note that these two functions both calls a function named `checkOnePCFallBack`. It's a helper to check if the transaction needs more than one request to finish prewrite. If so, the 1PC flag will be set to `false` and 1PC will be disabled for this transaction.

### Sending RPC Requests

After the procedure stated above, the control flow goes to [the `handleSingleBatch` method](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/prewrite.go#L149) of the `actionPrewrite` type. Then there's nothing complicated. It creates a RPC request for prewrite, and the `try_one_pc` field of the request will be set according to whether 1PC is still enabled after the previous procedure. For a 1PC transaction, once [`sender.Send`](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/prewrite.go#L208) is invoked and nothing goes wrong, it means the transaction is successfully committed by 1PC. Finally, the `execute` function will [return](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/2pc.go#L1273-L1284) without running the 2PC commit.

### Error Handling and Falling Back

However, there are chances that something goes wrong. There are multiple possible cases, some of which needs to be paid attention of:

#### Region Error

A region error means the region may have been changed, including merging and splitting, therefore the request is invalid since it's using an outdated region information.

Suppose we are trying to do prewrite for a 1PC transaction and encountered a region error. The keys in the transaction locates in a single region before, thus 1PC can be used. But the region's state has already changed, so the keys may locates in more than one new regions, if region splitting has happened.

However, we don't need any extra code to handle it for 1PC in this case. That's because on region error, it will [retry recursively](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/prewrite.go#L248), where `checkOnePCFallBack` will be invoked again. So in the stated above, the `checkOnePCFallBack` call will unset the 1PC flag while retrying.

#### Falled Back by TiKV

When TiKV receives a prewrite request with `try_one_pc` flag set, sometimes it's possible that TiKV cannot commit it directly in 1PC. In this case TiKV will perform a normal prewrite, and return a response with `one_pc_commit_ts = 0` to indicate that the transaction is not committed in 1PC way. Then, TiDB will continue normal 2PC procedure.

Currently, the only possible case that this fallback haapen is that the calculated `min_commit_ts` exceeds our `max_commit_ts`, therefore neither 1PC nor async commit can be used. The handling logic is [here](https://github.com/tikv/client-go/blob/4fc565e203a99400d0b080a25a93fb860b3b6fd6/txnkv/transaction/prewrite.go#L272-L280).

#### RPC Error

If we cannot receive an RPC response after a few retries, same as that in [async commit](async-commit.md#prewrite), there will be an undetermined error that will close the client connection.

### Recovery

When a 2PC transaction crashes on the half way, we need some mechanism to know the transaction's final state (committed or rolled back). For a 1PC transaction, things are much simpler: since TiKV performs the 1PC writing atomically, so the transaction must be either not-prewriten state or fully committed state. In other words, a 1PC transaction won't leave any lock after a crash. Therefore, nothing about 1PC transactions needs recovery.

## TiKV Part

1PC and async commit faces the same challenges: `commit_ts` calculation, follower read consistency, etc. Therefore, 1PC and async commit shares many code, including the concurrency manager and many logic in the prewrite procedure.

1PC transaction fetches the `max_ts` for `min_commit_ts` calculation and acquires the memory lock in the concurrency manager in the same way as how async commit does. The falling back logic is also using the same code as async commit. For details about them, please refer to [the article of async commit](async-commit.md#tikv-part).

The only notable difference from async commit is what data is being written after the prewrite request.

First, [here](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/actions/prewrite.rs#L417) the `txn` object buffers data in a different way from non-1PC transaction:

```rust
// impl MvccTxn
pub(crate) fn put_locks_for_1pc(&mut self, key: Key, lock: Lock, remove_pessimstic_lock: bool) {
    self.locks_for_1pc.push((key, lock, remove_pessimstic_lock));
}
```

Different from the normal `put_locks` function, locks are not serialized into bytes at this time. Neither are them immediately converted to `Write` records. It's because we don't know how they should be serialized until all keys are processed. While we expect the keys will be committed by 1PC, it's also possible that we find they need to [fallback](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/prewrite.rs#L506-L507) to 2PC later, in which case the locks will be [converted](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/prewrite.rs#L751-L755) to normal 2PC locks.

Then, If we don't see any error after processing all keys, the locks recorded by the `put_locks_for_1pc` function will be converted into `Write` records, and the final `min_commit_ts` will be used as the `commit_ts` ([here](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/prewrite.rs#L547) and [here](https://github.com/tikv/tikv/blob/v5.2.1/src/storage/txn/commands/prewrite.rs#L719)):

```rust
/// Commit and delete all 1pc locks in txn.
fn handle_1pc_locks(txn: &mut MvccTxn, commit_ts: TimeStamp) -> ReleasedLocks {
    let mut released_locks = ReleasedLocks::new(txn.start_ts, commit_ts);

    for (key, lock, delete_pessimistic_lock) in std::mem::take(&mut txn.locks_for_1pc) {
        let write = Write::new(
            WriteType::from_lock_type(lock.lock_type).unwrap(),
            txn.start_ts,
            lock.short_value,
        );
        // Transactions committed with 1PC should be impossible to overwrite rollback records.
        txn.put_write(key.clone(), commit_ts, write.as_ref().to_bytes());
        if delete_pessimistic_lock {
            released_locks.push(txn.unlock_key(key, true));
        }
    }

    released_locks
}
```

Note the special handling about `delete_pessimistic_lock`. If the transaction is a pessimistic transaction, there may already be pessimistic locks when we are performing `Prewrite`. Since we will write the `Write` record instead of overwriting the lock, if there's a pessimistic lock, it need to be deleted.

## Summary

Based on the work already done by async commit, there's not much code introduced by 1PC. 1PC faced a lot of tricky challenges that async commit meets too, and therefore the implementation of 1PC and async commit shares many common code. If you understand how async commit works, 1PC will not be too hard to understand.
