# Optimistic Transaction

Under the optimistic transaction model, modification conflicts are regarded as part of the transaction commit. TiDB cluster uses the optimistic transaction model by default before version 3.0.8, uses pessimistic transaction model after version 3.0.8. System variable `tidb_txn_mode` controls TiDB uses optimistic transaction mode or pessimistic transaction mode.

This document talks about the implementation of optimistic transaction in TiDB. It is recommended that you have learned about the [principles of optimistic transaction](https://docs.pingcap.com/tidb/stable/optimistic-transaction).

This document refers to the code of [TiDB v5.2.1](https://github.com/pingcap/tidb/tree/v5.2.1)

## Begin Optimistic Transaction

The main function stack to start an optimistic transaction is as followers.

```go
(a *ExecStmt) Exec
​    (a *ExecStmt) handleNoDelay
​        (a *ExecStmt) handleNoDelayExecutor
​            Next
​                (e *SimpleExec) Next
​                    (e *SimpleExec) executeBegin
```

The function `(e *SimpleExec) executeBegin` do the main work for  a "BEGIN" statement，The important comment and simplified code is as followers. The completed code is [here](https://github.com/pingcap/tidb/blob/cd8fb24c5f7ebd9d479ed228bb41848bd5e97445/executor/simple.go#L571) .

```go
/*

Check the syntax "start transaction read only" and "as of timestamp" used correctly.
If stale read timestamp was set,  creates a new stale read transaction and sets "in transaction" state, and return.
create a new transaction and set some properties like snapshot, startTS etc
*/

func (e *SimpleExec) executeBegin(ctx context.Context, s *ast.BeginStmt) error {
​    if s.ReadOnly {
​       // the statement "start transaction read only" must be used with tidb_enable_noop_functions is true
​       //  the statement "start transaction read only  as of timestamp" can be used Whether  tidb_enable_noop_functions  is true or false，but that tx_read_ts mustn't be set.
​       //  the statement "start transaction read only  as of timestamp" must ensure the timestamp is in the legal safe point range        
​       enableNoopFuncs := e.ctx.GetSessionVars().EnableNoopFuncs
​       if !enableNoopFuncs && s.AsOf == nil {
​           return expression.ErrFunctionsNoopImpl.GenWithStackByArgs("READ ONLY")
​       }

​       if s.AsOf != nil {
​           if e.ctx.GetSessionVars().TxnReadTS.PeakTxnReadTS() > 0 {
​              return errors.New("start transaction read only as of is forbidden after set transaction read only as of")
​           }
​       }
​    } 

​    // process stale read transaction
​    if e.staleTxnStartTS > 0 {
​      // check timestamp of stale read correctly
​       if err := e.ctx.NewStaleTxnWithStartTS(ctx, e.staleTxnStartTS); err != nil {
​           return err
​       }

​       // ignore tidb_snapshot configuration if in stale read transaction
​       vars := e.ctx.GetSessionVars()
​       vars.SetSystemVar(variable.TiDBSnapshot, "")
    
​       // set "in transaction" state and return
​       vars.SetInTxn(true)

​       return nil
​    }

​    /* If BEGIN is the first statement in TxnCtx, we can reuse the existing transaction, without the need to call NewTxn, which commits the existing transaction and begins a new one. If the last un-committed/un-rollback transaction is a time-bounded read-only transaction, we should always create a new transaction. */
    
​    txnCtx := e.ctx.GetSessionVars().TxnCtx
​    if txnCtx.History != nil || txnCtx.IsStaleness {
​       err := e.ctx.NewTxn(ctx)
​    }

​  // set "in transaction" state
   e.ctx.GetSessionVars().SetInTxn(true)

   // create a new transaction and set some properties like snapshot, startTS etc.
   txn, err := e.ctx.Txn(true)
​    // set Linearizability option
​    if s.CausalConsistencyOnly {
​       txn.SetOption(kv.GuaranteeLinearizability, false)
​    }

​    return nil
}
```

## DML Executed In Optimistic Transaction

There are three kinds of DML operations, such as update, delete and insert. For simplicity, This article only describes the update statement execution process. DML mutations are not sended to tikv directly, but buffered in TiDB temporarily, commit operation make the mutations effective at last.

The main function stack to execute an update statement such as "update t1 set id2 = 2 where pk = 1" is as followers.

```go
(a *ExecStmt) Exec
​    (a *ExecStmt) handleNoDelay
​        (a *ExecStmt) handleNoDelayExecutor
​            (e *UpdateExec) updateRows
​                 Next
​                   (e *PointGetExecutor) Next
```

### (e *UpdateExec) updateRows

The function `(e *UpdateExec) updateRows` does the main work for update statement. The important comment and simplified code are as followers. The completed code is [here](https://github.com/pingcap/tidb/blob/cd8fb24c5f7ebd9d479ed228bb41848bd5e97445/executor/update.go#L229) .

```go
/*
Take a batch of data that needs to be updated each time.
Traverse every row in the batch, make handle which identifies the data uniquely for the row and generate a new row.
Write the new row to table.
*/

func (e *UpdateExec) updateRows(ctx context.Context) (int, error) {
​    globalRowIdx := 0
​    chk := newFirstChunk(e.children[0])
​    // composeFunc generates a new row 
​    composeFunc = e.composeNewRow
​    totalNumRows := 0

​    for {
​       // call "Next" method recursively until every executor finished, every "Next" returns a batch rows
​       err := Next(ctx, e.children[0], chk)

​       // If all rows are updated, return
​       if chk.NumRows() == 0 {
​           break
​       }

​       for rowIdx := 0; rowIdx < chk.NumRows(); rowIdx++ {
​           // take one row from the batch above
​           chunkRow := chk.GetRow(rowIdx)
​	        // convert the data from chunk.Row to types.DatumRow，stored by fields
​           datumRow := chunkRow.GetDatumRow(fields)
​           // generate handle which is  unique ID for every row
​           e.prepare(datumRow)
​           // compose non-generated columns
​           newRow, err := composeFunc(globalRowIdx, datumRow, colsInfo)
​           // merge non-generated columns
​           e.merge(datumRow, newRow, false)
​	        // compose generated columns and merge generated columns
​           if e.virtualAssignmentsOffset < len(e.OrderedList) {          
​              newRow = e.composeGeneratedColumns(globalRowIdx, newRow, colsInfo)     
​              e.merge(datumRow, newRow, true)
​           }

​           // write to table
​           e.exec(ctx, e.children[0].Schema(), datumRow, newRow)
​       }
​    }
}
```

## Commit Optimistic Transaction

Committing transaction includes "prewrite" and "commit" two phases that are explained separately below. The function `(c *twoPhaseCommitter) execute` does the main work for committing transaction. The important comment and simplified code are as followers. The completed code is [here](https://github.com/tikv/client-go/blob/391fcd842dc8dd4bc9632f1ae710584abf21fe0b/txnkv/transaction/2pc.go#L1112) .

```go
/*
do the "prewrite" operation first
if OnePC transaction, return immediately
if AsyncCommit transaction, commit the transaction Asynchronously and return
if not OnePC and AsyncCommit transaction, commit the transaction synchronously.
*/

func (c *twoPhaseCommitter) execute(ctx context.Context) (err error) {
​    // do the "prewrite" operation
​    c.prewriteStarted = true

​    start := time.Now()
​    err = c.prewriteMutations(bo, c.mutations) 
​    if c.isOnePC() {
​       // If OnePC transaction, return immediately
​       return nil
​    }  

​    if c.isAsyncCommit() {  
​       // commit the transaction Asynchronously and return for AsyncCommit
​       go func() {
​           err := c.commitMutations(commitBo, c.mutations)
​       }          

​       return nil
​    } else {  
​        // do the "commit" phase 
​        return c.commitTxn(ctx, commitDetail)
​    } 
}
```

### prewrite

The entry function to prewrite a transaction is `(c *twoPhaseCommitter) prewriteMutations` which calls the function `(batchExe *batchExecutor) process` to do it. The function `(batchExe *batchExecutor) process` calls `(batchExe *batchExecutor) startWorker` to prewrite evenry batch parallelly. The function  `(batchExe *batchExecutor) startWorker` calls `(action actionPrewrite) handleSingleBatch` to prewrite a single batch.

#### (batchExe *batchExecutor) process

The important comment and simplified code are as followers. The completed code is [here](https://github.com/tikv/client-go/blob/391fcd842dc8dd4bc9632f1ae710584abf21fe0b/txnkv/transaction/2pc.go#L1818) .

```go
// start worker routine to prewrite every batch parallely and collect results
func (batchExe *batchExecutor) process(batches []batchMutations) error {
​    var err error
​    err = batchExe.initUtils()
​    // For prewrite, stop sending other requests after receiving first error.
​    var cancel context.CancelFunc

​    if _, ok := batchExe.action.(actionPrewrite); ok {
​       batchExe.backoffer, cancel = batchExe.backoffer.Fork()
​       defer cancel()  
​    }

​    // concurrently do the work for each batch.
​    ch := make(chan error, len(batches))
​    exitCh := make(chan struct{})
​    go batchExe.startWorker(exitCh, ch, batches)
​    // check results of every batch prewrite synchronously, if one batch fails, 
​    // stops every prewrite worker routine immediately.
​    for i := 0; i < len(batches); i++ {
​       if e := <-ch; e != nil {
​           // Cancel other requests and return the first error.
​           if cancel != nil {
​              cancel()
​           }

​           if err == nil {
​              err = e
​           }
​       }
​    }

​    close(exitCh)   // break the loop of function startWorker

​    return err
}
```

#### (batchExe *batchExecutor) startWorker

The important comment and simplified code are as followers. The completed code is [here](https://github.com/tikv/client-go/blob/391fcd842dc8dd4bc9632f1ae710584abf21fe0b/txnkv/transaction/2pc.go#L1770) .

```go
// startWork concurrently do the work for each batch considering rate limit
func (batchExe *batchExecutor) startWorker(exitCh chan struct{}, ch chan error, batches []batchMutations) {
​    for idx, batch1 := range batches {
​       waitStart := time.Now()
​       //  Limit the number of go routines by the buffer size of channel
​       if exit := batchExe.rateLimiter.GetToken(exitCh); !exit {
​           batchExe.tokenWaitDuration += time.Since(waitStart)
​           batch := batch1
​           //  call the function "handleSingleBatch" to prewrite every batch keys
​           go func() {
​              defer batchExe.rateLimiter.PutToken() //  release the chan buffer
​              ch <- batchExe.action.handleSingleBatch(batchExe.committer, singleBatchBackoffer, batch)
​           }()

​       } else {
​           break
​       }
​    }
}
```

#### (action actionPrewrite) handleSingleBatch

The important comment and simplified code are as followers. The completed code is [here](https://github.com/tikv/client-go/blob/843a5378aa9101c0e2aba61e0c2c11b3f122f08f/txnkv/transaction/prewrite.go#L149) .

```go
/*

create a prewrite request and a region request sender that sends the prewrite request to tikv.
(1)get Prewrite Response coming from tikv
(2)If no error happened and it is OnePC transaction, update onePCCommitTS by prewriteResp and return
(3)if no error happened and it is AsyncCommit transaction, update minCommitTS  if need and return
(4)If errors hanpped beacause of lock confilict, extract the locks from the error responsed, resolove the locks expired
(5)do the backoff for prewrite
*/

func (action actionPrewrite) handleSingleBatch(c *twoPhaseCommitter, bo *retry.Backoffer, batch batchMutations) (err error) {
​    // create a prewrite request and a region request sender that sends the prewrite request to tikv.
​    txnSize := uint64(c.regionTxnSize[batch.region.GetID()])
​    req := c.buildPrewriteRequest(batch, txnSize)
​    sender := locate.NewRegionRequestSender(c.store.GetRegionCache(), c.store.GetTiKVClient())

​    for {
​       resp, err := sender.SendReq(bo, req, batch.region, client.ReadTimeoutShort)
​       regionErr, err := resp.GetRegionError()  

​       // get Prewrite Response coming from tikv
​       prewriteResp := resp.Resp.(*kvrpcpb.PrewriteResponse)
​       keyErrs := prewriteResp.GetErrors()
​       if len(keyErrs) == 0 {  
​           // If no error happened and it is OnePC transaction, update onePCCommitTS by prewriteResp and return
​           if c.isOnePC() {
​                c.onePCCommitTS = prewriteResp.OnePcCommitTs
​                return nil
​          } 

​          // if no error happened and it is AsyncCommit transaction, update minCommitTS  if need and return
​          if c.isAsyncCommit() {
​                  if prewriteResp.MinCommitTs > c.minCommitTS {
​                       c.minCommitTS = prewriteResp.MinCommitTs
​                  }
​           }
​           return nil
​       }// if len(keyErrs) == 0

​       // If errors hanpped beacause of lock confilict, extract the locks from the error responsed
​       var locks []*txnlock.Lock
​       for _, keyErr := range keyErrs {
​           // Extract lock from key error
​           lock, err1 := txnlock.ExtractLockFromKeyErr(keyErr)
​           if err1 != nil {
​              return errors.Trace(err1)
​           }
​           locks = append(locks, lock)
​       }// for _, keyErr := range keyErrs
​       // resolve conflict locks expired, do the backoff for prewrite
​       start := time.Now()
​       msBeforeExpired, err := c.store.GetLockResolver().ResolveLocksForWrite(bo, c.startTS, c.forUpdateTS, locks)
​       if msBeforeExpired > 0 {
​           err = bo.BackoffWithCfgAndMaxSleep(retry.BoTxnLock, int(msBeforeExpired), errors.Errorf("2PC prewrite lockedKeys: %d", len(locks)))
​           if err != nil {
​              return errors.Trace(err) // backoff exceeded maxtime, returns error
​           }
​       }
​    }// for loop
}
```

### commit

The entry function of commiting a transaction is `(c *twoPhaseCommitter) commitMutations` which calls the function `(c *twoPhaseCommitter) doActionOnGroupMutations` to do it. The batch of primary key will be committed first, then the function `(batchExe *batchExecutor) process` calls `(batchExe *batchExecutor) startWorker` to commit the rest batches parallelly and asynchronously. The function  `(batchExe *batchExecutor) startWorker` calls `(actionCommit) handleSingleBatch` to commit a single batch.

#### (c *twoPhaseCommitter) doActionOnGroupMutations

The important comment and simplified code are as followers. The completed code is [here](https://github.com/tikv/client-go/blob/843a5378aa9101c0e2aba61e0c2c11b3f122f08f/txnkv/transaction/2pc.go) .

```go
/*
If the groups contain primary, commit the primary batch synchronously
If the first time to commit, spawn a goroutine to commit secondary batches asynchronously
if retry to commit,  commit the secondary batches synchronously, because itself is in the asynchronously goroutine
*/

func (c *twoPhaseCommitter) doActionOnGroupMutations(bo *retry.Backoffer, action twoPhaseCommitAction, groups []groupedMutations) error {
​    batchBuilder := newBatched(c.primary())
​    // Whether the groups being operated contain primary
​    firstIsPrimary := batchBuilder.setPrimary()
​    actionCommit, actionIsCommit := action.(actionCommit)
​    c.checkOnePCFallBack(action, len(batchBuilder.allBatches()))
​    // If the groups contain primary, commit the primary batch synchronously
​    if firstIsPrimary &&
​       (actionIsCommit && !c.isAsyncCommit()) {
​         // primary should be committed(not async commit)/cleanup/pessimistically locked first
​       err = c.doActionOnBatches(bo, action, batchBuilder.primaryBatch())    
​       batchBuilder.forgetPrimary()
​    }
​  // If the first time to commit, spawn a goroutine to commit secondary batches asynchronously
   // if retry to commit,  commit the secondary batches synchronously, because itself is in the asynchronously goroutine
​    if actionIsCommit && !actionCommit.retry && !c.isAsyncCommit() {
​        secondaryBo := retry.NewBackofferWithVars(c.store.Ctx(), CommitSecondaryMaxBackoff, c.txn.vars)
​       c.store.WaitGroup().Add(1)
​       go func() {
​           defer c.store.WaitGroup().Done()
​           e := c.doActionOnBatches(secondaryBo, action, batchBuilder.allBatches())
​       }
​    }
​    else {
​       err = c.doActionOnBatches(bo, action, batchBuilder.allBatches())
​    }

​    return errors.Trace(err)
}
```

#### (batchExe *batchExecutor) process

The function `(c *twoPhaseCommitter) doActionOnGroupMutations` calls `(c *twoPhaseCommitter) doActionOnBatches` to do the second phase of commit. The function `(c *twoPhaseCommitter) doActionOnBatches` calls `(batchExe *batchExecutor) process` to do the main work.

The important comment and simplified code of function `(batchExe *batchExecutor) process`  are as mentioned above in prewrite part . The completed code is [here](https://github.com/tikv/client-go/blob/843a5378aa9101c0e2aba61e0c2c11b3f122f08f/txnkv/transaction/2pc.go) .

#### (actionCommit) handleSingleBatch

The function `(batchExe *batchExecutor) process` calls the function `(actionCommit) handleSingleBatch` to send commit request to all tikv nodes.

The important comment and simplified code are as followers. The completed code is [here](https://github.com/tikv/client-go/blob/843a5378aa9101c0e2aba61e0c2c11b3f122f08f/txnkv/transaction/commit.go#L67) .

```go
/*
create a commit request and commit sender.
If regionErr happened, backoff and retry the commit operation.
If the error is not a regionErr, but rejected by TiKV beacause the commit ts was expired, retry with a newer commits.
Other errors happened, return error immediately.
No error happened, exit the for loop and return success.
*/

func (actionCommit) handleSingleBatch(c *twoPhaseCommitter, bo *retry.Backoffer, batch batchMutations) error {
​    // create a commit request and commit sender
​    keys := batch.mutations.GetKeys()
​    req := tikvrpc.NewRequest(tikvrpc.CmdCommit, &kvrpcpb.CommitRequest{
​       StartVersion: c.startTS,
​        Keys:     keys,
​       CommitVersion: c.commitTS,
​    }, kvrpcpb.Context{Priority: c.priority, SyncLog: c.syncLog,
​       ResourceGroupTag: c.resourceGroupTag, DiskFullOpt: c.diskFullOpt}) 

​    tBegin := time.Now()
​    attempts := 0 
​    sender := locate.NewRegionRequestSender(c.store.GetRegionCache(), c.store.GetTiKVClient())

​    for {
​       attempts++
​       resp, err := sender.SendReq(bo, req, batch.region, client.ReadTimeoutShort)
​       regionErr, err := resp.GetRegionError()
​       // If regionErr happened, backoff and retry the commit operation
​       if regionErr != nil {
​           // For other region error and the fake region error, backoff because there's something wrong.
​           // For the real EpochNotMatch error, don't backoff.
​           if regionErr.GetEpochNotMatch() == nil || locate.IsFakeRegionError(regionErr) {
​              err = bo.Backoff(retry.BoRegionMiss, errors.New(regionErr.String()))
​              if err != nil {
​                  return errors.Trace(err)
​              }
​           }

​           same, err := batch.relocate(bo, c.store.GetRegionCache())
​           if err != nil {
​              return errors.Trace(err)
​           }

​           if same {
​              continue
​           }

​           err = c.doActionOnMutations(bo, actionCommit{true}, batch.mutations)
​           return errors.Trace(err)
​       }// if regionErr != nil

​	   // If the error is not a regionErr, but rejected by TiKV beacause the commit ts was expired, retry with a newer commits. Other errors happened, return error immediately.

​       commitResp := resp.Resp.(*kvrpcpb.CommitResponse)
​       if keyErr := commitResp.GetError(); keyErr != nil {
​           if rejected := keyErr.GetCommitTsExpired(); rejected != nil {
​              // 2PC commitTS rejected by TiKV, retry with a newer commits, update commit ts and retry.
​              commitTS, err := c.store.GetTimestampWithRetry(bo, c.txn.GetScope())
​              c.mu.Lock()
​              c.commitTS = commitTS
​              c.mu.Unlock()
​              // Update the commitTS of the request and retry.
​              req.Commit().CommitVersion = commitTS
​              continue
​           }

​           if c.mu.committed {
​              // 2PC failed commit key after primary key committed
​              // No secondary key could be rolled back after it's primary key is committed.
​               return errors.Trace(err)
​           }
​           return err
​       }

​        // No error happened, exit the for loop
​        break  
​    }// for loop
}
```
