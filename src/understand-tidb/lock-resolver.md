# Lock Resolver

As we described in [other sections](./transaction.md), TiDB's transaction system is based on Google's [Percolator](https://tikv.org/deep-dive/distributed-transaction/percolator/) algorithm. Which makes it necessary to resolve locks when a reading transaction meets locked keys or during [GC](./mvcc-garbage-collection.md).

So we introduced Lock Resolver in TiDB to resolve locks.

## The Data Structure

Lock Resolver is a quiet simple struct: 

```go
type LockResolver struct {
	store storage
	mu    struct {
		sync.RWMutex
		// resolved caches resolved txns (FIFO, txn id -> txnStatus).
		resolved       map[uint64]TxnStatus
		recentResolved *list.List
	}
}
```

The `store` field is used to send requests to a region on TiKV.
And the fields inside the `mu` are used to cache the resolved transactions' status, which is used to speed up the transaction status checking.

## Lock Resolving process

Now let's see the real important part: the lock resolving process.

Basically, the resolving process is in 2 steps:
1. For each lock, get the commit status of the corresponding transaction.
2. Send `ResolveLock` cmd to tell the storage layer to do the resolve work.

In the following several paragraphs, we will give you some brief introduction about each step.

If you want to read all of the code, [`LockResolver.resolveLocks`](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L303) is a good place to start.

### Get transaction status for a lock

#### TiDB part

Related code is [`LockResolver.getTxnStatusFromLock`](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L452) and [`LockResolver.getTxnStatus`](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L526).

[`LockResolver.getTxnStatus`](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L526) just assemble a `CheckTxnStatus` request and send it to the TiKV the primary key is located on. TiKV will return a [`TxnStatus`](https://tikv.github.io/doc/tikv/storage/enum.TxnStatus.html), which represents the status of a transaction, like `RolledBack`(the transaction has already been rolled back before), `TtlExpire`(the transaction's is expired, TiKV just rolled it back), `Committed`(the transaction was committed successfully before), etc. to TiDB.

[`LockResolver.getTxnStatusFromLock`](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L452) basically delegate its work to [`LockResolver.getTxnStatus`](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L526) with the information in the lock and add some retry and error handling logic.

#### TiKV part

As we showed above, we use a [`CheckTxnStatus`](https://tikv.github.io/doc/tikv/storage/txn/commands/struct.CheckTxnStatus.html) request to get the status of a transaction when resolving a lock.

The major processing logic can be found [`here`](https://github.com/tikv/tikv/blob/86d80e98927fb372536bcb52937c421ebf78c8b2/src/storage/txn/commands/check_txn_status.rs#L67), this function is a little complex (mainly because the scheduling process in TiKV), I'll show you the basic idea with some simplified pseudo code with detailed comments, before that, there are several optimizations and related concepts we should know:

##### collapse continuous rollbacks ([tikv#3290](https://github.com/tikv/tikv/pull/3290))

Instead of keeping all rollbacks in write column family when a key rollbacked for several times, this PR collapse continuous rollbacks, and only keep the latest rollback.

##### protect primary locks ([tikv#5575](https://github.com/tikv/tikv/pull/5575))

After we have pessimistic lock in TiKV, if the rollback record of the primary lock is collapsed and TiKV receives stale acquire_pessimistic_lock and prewrite, the transaction will commit successfully even if secondary locks are rolled back. To solve this problem, we can prevent the rollback records of the primary key of pessimistic transactions from being collapsed. By setting the short value of these rollback records to "protected".

##### gc_fence ([tikv#9207](https://github.com/tikv/tikv/pull/9207))

See the super detailed comment [here](https://github.com/tikv/tikv/blob/a345ff7f835b49c9addf4883b339ce268e1668cc/components/txn_types/src/write.rs#L77).

After understand these, you can finally understand the code:

```
fn process_write(self, snapshot: Snapshot, context: WriteContext) {
	// async commit related stuff, see async commit doc
	context.concurrency_manager.update_max_ts();

	let lock = load_lock_on(self.primary_key);

	let (txn_status, released) = if let Some(lock) = lock && lock.ts == self.lock_ts {
		// the lock still exists, ie. the transaction is still alive
		check_txn_status_lock_exists();
	} else {
		// the lock is missing
		check_txn_status_missing_lock();
	}

	if let TxnStatus::TtlExpire = txn_status {
        context.lock_mgr.notify_released(released);
    }

	// return result to user
	return txn_status;
}
```

```
fn check_txn_status_lock_exists(
	primary_key: Key,
	lock: Lock,
) {
	if use_async_commit {
		return (TxnStatus::Uncommitted, None)
	}
	let lock_expired = lock.ts.physical() + lock.ttl < current_ts.physical()
	if lock_expired {
		if resolving_pessimistic_lock && lock.lock_type == LockType::Pessimistic {
			// unlock_key just delete `primary_key` in lockCF
            let released = unlock_key(primary_key);
            return (TxnStatus::PessimisticRollBack, released);
        } else {
			// rollback_lock is complex, see below
            let released = rollback_lock(lock);
            return (TxnStatus::TtlExpire, released);
        }
	}
	return (TxnStatus::Uncommitted, None)
}
```

```
pub fn rollback_lock() {
	// get transaction commit record on `key`
	let commit_record = get_txn_commit_record(key);
    let overlapped_write = match commit_record {
		// The commit record of the given transaction is not found. 
		// But it's possible that there's another transaction's commit record, whose `commit_ts` equals to the current transaction's `start_ts`. That kind of record will be returned via the `overlapped_write` field.
    	// In this case, if the current transaction is to be rolled back, the `overlapped_write` must not be overwritten.
        TxnCommitRecord::None { overlapped_write } => overlapped_write,
        TxnCommitRecord::SingleRecord { write, .. } if write.write_type != WriteType::Rollback => {
            panic!("txn record found but not expected: {:?}", txn)
        }
        _ => return txn.unlock_key(key, is_pessimistic_txn),
    };

    // If prewrite type is DEL or LOCK or PESSIMISTIC, it is no need to delete value.
    if lock.short_value.is_none() && lock.lock_type == LockType::Put {
        delete_value(key, lock.ts);
    }

	// if this is primary key of a pessimistic transaction, we need to protect the rollback just as we mentioned above
	let protect = is_pessimistic_txn && key.is_encoded_from(&lock.primary);
	put_rollback_record(key, protect);
	collapse_prev_rollback(key);
    return unlock_key(key, is_pessimistic_txn);
}
```

```
pub fn check_txn_status_missing_lock() {
    match get_txn_commit_record(primary_key) {
        TxnCommitRecord::SingleRecord { commit_ts, write } => {
            if write.write_type == WriteType::Rollback {
                Ok(TxnStatus::RolledBack)
            } else {
                Ok(TxnStatus::committed(commit_ts))
            }
        }
        TxnCommitRecord::OverlappedRollback { .. } => Ok(TxnStatus::RolledBack),
        TxnCommitRecord::None { overlapped_write } => {
            if MissingLockAction::ReturnError == action {
                return Err(TxnNotFound);
            }
            if resolving_pessimistic_lock {
                return Ok(TxnStatus::LockNotExistDoNothing);
            }

            let ts = reader.start_ts;

            if action == MissingLockAction::Rollback {
                collapse_prev_rollback(txn, reader, &primary_key)?;
            }

            if let (Some(l), None) = (mismatch_lock, overlapped_write.as_ref()) {
				// When putting rollback record on a key that's locked by another transaction, the second transaction may overwrite the current rollback record when it's committed. Sometimes it may break consistency. 
				// To solve the problem, add the timestamp of the current rollback to the lock. So when the lock is committed, it can check if it will overwrite a rollback record by checking the information in the lock.
                mark_rollback_on_mismatching_lock(
                    &primary_key,
                    l,
                    action == MissingLockAction::ProtectedRollback,
                );
            }

            // Insert a Rollback to Write CF in case that a stale prewrite
            // command is received after a cleanup command.
			put_rollback_record(primary_key, action == MissingLockAction::ProtectedRollback);

            Ok(TxnStatus::LockNotExist)
        }
    }
}
```
### Resolve
#### TiDB Part

After we get the transaction status with [`LockResolver.getTxnStatusFromLock`](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L452) [here](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L330), if the transaction has been expired (either committed or rollbacked), we need to resolve the lock.

There are three different kinds of locks we need to pay attention to when doing the resolving work:
* locks created by [async commit](./async-commit.md) transactions
  This kind of lock will be resolved by [`resolveLockAsync` function](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L738), you can refer to [Transaction recovery chapter in *async commit*](./async-commit.md) for more information.
* pessimistic locks created by [pessimistic transaction](./pessimistic-transaction.md)
  This kind of lock will be resolved by [`resolvePessimisticLock` function](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L933), which just send [`PessimisticRollbackRequest`](https://tikv.github.io/doc/kvproto/kvrpcpb/struct.PessimisticRollbackRequest.html) to TiKV, with some retry and error handling logic.
* optimistic locks created by [optimistic transaction](./optimistic-transaction.md)
  This kind of lock will be resolved by [`resolveLock` function](https://github.com/tikv/client-go/blob/cef46d13cc007387e814f231d9e7ec0b4cc1bfaf/txnkv/txnlock/lock_resolver.go#L874), which just send [`ResolveLockRequest`](https://tikv.github.io/doc/kvproto/kvrpcpb/struct.ResolveLockRequest.html) to TiKV, with some retry and error handling logic.

#### TiKV Part

When a resolve lock request reaches TiKV, depends on whether `resolve_keys` field is empty or not, TiKV will do different things:

##### ResolveLockReadPhase + ResolveLock

This will triggered when `resolve_keys` field is not set.

`ResolveLockReadPhase` will scan keys and locks on them which should be resolved in a region, to prevent huge writes, we'll do the scan in batches (`RESOLVE_LOCK_BATCH_SIZE` keys in a batch).

After each batch is read, a `ResolveLock` command will be spawned to do the real resolve work.

In `ResolveLock`, for each key and lock on it, depend on whether the transaction status
is committed or not, we'll cleanup or commit it.

And then, TiKV will wake up the blocked transactions, and we are done.

##### ResolveLockLite

This will triggered when `resolve_keys` field is set.

`ResolveLockLite` is just a simplified version of `ResolveLock`, which will do the resolve work on `resolve_keys` on the request.

## Where do we use it?

* When [acquiring PessimisticLock](https://github.com/tikv/client-go/blob/9ec50224bea69a1d20d34535db5791f054928501/txnkv/transaction/pessimistic.go#L212),
it is possible that a transaction meet other transaction's lock when it is trying to acquire the lock. In this situation, we should try to resolve the old transaction's lock first.
* When reading from TiKV, eg. when [scanning data](https://github.com/tikv/client-go/blob/9ec50224bea69a1d20d34535db5791f054928501/txnkv/txnsnapshot/scan.go#L283), we should resolve the lock we met first.
* When doing [GC](https://github.com/tikv/client-go/blob/9ec50224bea69a1d20d34535db5791f054928501/tikv/gc.go#L52), see [the GC chapter](./mvcc-garbage-collection.md) for detail.

## Summary

This document talked about the data structure of Lock Resolver in TiDB, and its working process and usage. You can combine this with other parts of our [transaction system](./transaction.md) to have a deeper understanding.