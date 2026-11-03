// Realistic incident logs for the Workbench presets. They are data, never translated.

export const PRESET_IDS = [
  'prismaPool',
  'fastapiRedis',
  'kubernetesOom',
  'tokioPanic',
  'grpcCertificate',
  'edgeRateLimit',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

const PRISMA_POOL = `2026-11-03T14:02:00.112Z INFO  [api] server listening on :3000 pid=4120 node=v22.11.0
2026-11-03T14:02:00.340Z INFO  [prisma] connection pool ready connection_limit=10 pool_timeout=10s
2026-11-03T14:02:03.018Z INFO  [api] GET /health status=200 latency=2ms request_id=req-7a01
2026-11-03T14:02:04.551Z INFO  [orders] GET /orders?page=1 status=200 latency=48ms request_id=req-7a02 trace_id=4bf92f3577b34da6
2026-11-03T14:02:05.902Z INFO  [orders] POST /orders status=201 latency=91ms request_id=req-7a03 trace_id=8a3c60f7d188f8fa user=u_1842
2026-11-03T14:02:07.330Z INFO  [reports] export job started job=rep-22 user=u_0007 request_id=req-7a04 trace_id=c1d2e3f4a5b60718
2026-11-03T14:02:07.334Z DEBUG [prisma] prisma:query SELECT "Order".* FROM "Order" WHERE "createdAt" >= $1 request_id=req-7a04
2026-11-03T14:02:08.120Z INFO  [orders] GET /orders/9912 status=200 latency=37ms request_id=req-7a05 trace_id=1e2f3a4b5c6d7e8f
2026-11-03T14:02:09.004Z WARN  [prisma] slow query took 2140ms model=Order action=findMany request_id=req-7a04
2026-11-03T14:02:09.876Z INFO  [api] GET /health status=200 latency=3ms request_id=req-7a06
2026-11-03T14:02:10.415Z INFO  [reports] export job started job=rep-23 user=u_0007 request_id=req-7a07 trace_id=d4c3b2a190807060
2026-11-03T14:02:10.902Z INFO  [reports] export job started job=rep-24 user=u_0007 request_id=req-7a08 trace_id=e5d4c3b2a1908070
2026-11-03T14:02:11.517Z WARN  [prisma] pool usage high in_use=9 idle=1 waiting=4
2026-11-03T14:02:12.033Z INFO  [orders] POST /orders status=201 latency=812ms request_id=req-7a09 trace_id=f6e5d4c3b2a19080 user=u_2210
2026-11-03T14:02:13.648Z WARN  [prisma] pool exhausted in_use=10 idle=0 waiting=17
2026-11-03T14:02:14.002Z INFO  [api] GET /health status=200 latency=4ms request_id=req-7a0a
2026-11-03T14:02:18.771Z WARN  [orders] GET /orders?page=2 waiting for connection waited=5000ms request_id=req-7a0b trace_id=0a1b2c3d4e5f6071
2026-11-03T14:02:23.774Z ERROR [prisma] PrismaClientKnownRequestError: Timed out fetching a new connection from the connection pool. code=P2024 connection_limit=10 timeout=10s request_id=req-7a0b
    at Fn.handleRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:7749)
    at Fn.handleAndLogRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:7057)
    at async OrderService.list (/app/dist/orders/order.service.js:42:22)
    at async /app/dist/orders/order.controller.js:18:20
2026-11-03T14:02:23.776Z ERROR [orders] GET /orders?page=2 status=500 latency=10012ms request_id=req-7a0b trace_id=0a1b2c3d4e5f6071 error=P2024
2026-11-03T14:02:24.102Z ERROR [prisma] PrismaClientKnownRequestError: Timed out fetching a new connection from the connection pool. code=P2024 request_id=req-7a0c
2026-11-03T14:02:24.105Z ERROR [orders] POST /orders status=500 latency=10021ms request_id=req-7a0c trace_id=9f8e7d6c5b4a3921 user=u_3120 error=P2024
2026-11-03T14:02:24.380Z INFO  [api] GET /health status=200 latency=3ms request_id=req-7a0d
2026-11-03T14:02:25.011Z ERROR [checkout] payment intent not saved status=500 latency=10004ms request_id=req-7a0e trace_id=77aa88bb99cc0011 error=P2024
2026-11-03T14:02:25.640Z WARN  [api] circuit half-open for route=/orders failures=5 window=30s
2026-11-03T14:02:26.218Z ERROR [orders] GET /orders/9913 status=500 latency=10009ms request_id=req-7a0f trace_id=2233445566778899 error=P2024
2026-11-03T14:02:27.904Z INFO  [reports] export job still running job=rep-22 rows=184000 elapsed=20.5s
2026-11-03T14:02:28.330Z ERROR [api] 5xx rate above threshold rate=0.41 window=60s alert=orders-5xx
2026-11-03T14:02:29.712Z WARN  [k8s] readiness probe slow pod=api-7c9d latency=1800ms
2026-11-03T14:02:31.005Z INFO  [reports] export job finished job=rep-22 rows=212400 elapsed=23.6s
2026-11-03T14:02:31.007Z INFO  [prisma] connection released in_use=9 idle=1 waiting=11
2026-11-03T14:02:33.450Z ERROR [orders] POST /orders status=500 latency=10015ms request_id=req-7a10 trace_id=aabbccddeeff0011 error=P2024
2026-11-03T14:02:36.120Z INFO  [reports] export job finished job=rep-23 rows=209870 elapsed=25.7s
2026-11-03T14:02:36.122Z INFO  [prisma] connection released in_use=8 idle=2 waiting=6
2026-11-03T14:02:38.004Z INFO  [orders] GET /orders?page=1 status=200 latency=2480ms request_id=req-7a11 trace_id=1122aabb3344ccdd
2026-11-03T14:02:40.733Z INFO  [reports] export job finished job=rep-24 rows=210112 elapsed=29.8s
2026-11-03T14:02:41.115Z INFO  [prisma] pool usage normal in_use=3 idle=7 waiting=0
2026-11-03T14:02:42.020Z INFO  [orders] POST /orders status=201 latency=88ms request_id=req-7a12 trace_id=5566eeff7788aabb user=u_3120
2026-11-03T14:02:43.300Z INFO  [api] GET /health status=200 latency=2ms request_id=req-7a13`;

const FASTAPI_REDIS = `2026-11-03T08:30:00.004Z INFO     [uvicorn] Started server process [1] service=inventory-api
2026-11-03T08:30:00.212Z INFO     [uvicorn] Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
2026-11-03T08:30:01.540Z INFO     [inventory] GET /items/sku-1101 status=200 latency=14ms request_id=6f1c2a trace_id=a1b2c3d4e5f60708
2026-11-03T08:30:02.118Z INFO     [inventory] GET /health status=200 latency=1ms request_id=6f1c2b
2026-11-03T08:30:03.876Z INFO     [inventory] POST /reserve sku=sku-1101 qty=2 status=200 latency=22ms request_id=6f1c2c trace_id=b2c3d4e5f6070809 user=shop-17
2026-11-03T08:30:05.201Z WARN     [redis] master link down, replica re-syncing host=redis-0.redis:6379
2026-11-03T08:30:05.330Z INFO     [inventory] GET /items/sku-2040 status=200 latency=18ms request_id=6f1c2d trace_id=c3d4e5f607080910
2026-11-03T08:30:06.004Z WARN     [redis] dataset loading in memory host=redis-0.redis:6379 progress=12%
2026-11-03T08:30:06.912Z ERROR    [inventory] cache read failed: BusyLoadingError: Redis is loading the dataset in memory request_id=6f1c2e trace_id=d4e5f60708091011
2026-11-03T08:30:06.913Z INFO     [inventory] falling back to postgres for sku=sku-2040 request_id=6f1c2e
2026-11-03T08:30:07.450Z INFO     [inventory] POST /reserve sku=sku-2040 qty=1 status=200 latency=140ms request_id=6f1c2f trace_id=e5f6070809101112 user=shop-03
2026-11-03T08:30:08.020Z WARN     [locks] lock wait lock=stock:sku-1101 holder=worker-2 waited=1500ms request_id=6f1c30
2026-11-03T08:30:08.775Z INFO     [inventory] GET /health status=200 latency=1ms request_id=6f1c31
2026-11-03T08:30:09.540Z WARN     [locks] lock wait lock=stock:sku-2040 holder=worker-1 waited=1500ms request_id=6f1c32
2026-11-03T08:30:10.020Z ERROR    [locks] lock wait timeout lock=stock:sku-1101 holder=worker-2 waiter=worker-1 timeout=3000ms request_id=6f1c30 trace_id=f607080910111213
2026-11-03T08:30:10.022Z ERROR    [locks] lock wait timeout lock=stock:sku-2040 holder=worker-1 waiter=worker-2 timeout=3000ms request_id=6f1c32 trace_id=0708091011121314
2026-11-03T08:30:10.023Z WARN     [locks] possible deadlock: worker-1 holds stock:sku-2040 and waits stock:sku-1101; worker-2 holds stock:sku-1101 and waits stock:sku-2040
2026-11-03T08:30:10.031Z ERROR    [uvicorn] Exception in ASGI application request_id=6f1c30
Traceback (most recent call last):
  File "/usr/local/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 409, in run_asgi
    result = await app(self.scope, self.receive, self.send)
  File "/usr/local/lib/python3.12/site-packages/fastapi/applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "/app/inventory/routes/reserve.py", line 58, in reserve
    async with stock_lock(sku_a), stock_lock(sku_b):
  File "/app/inventory/locks.py", line 31, in stock_lock
    raise LockTimeout(f"lock wait timeout on {key}")
inventory.locks.LockTimeout: lock wait timeout on stock:sku-1101
2026-11-03T08:30:10.034Z ERROR    [inventory] POST /reserve status=500 latency=3012ms request_id=6f1c30 trace_id=f607080910111213 user=shop-17
2026-11-03T08:30:10.036Z ERROR    [inventory] POST /reserve status=500 latency=3010ms request_id=6f1c32 trace_id=0708091011121314 user=shop-03
2026-11-03T08:30:11.204Z INFO     [inventory] GET /items/sku-3001 status=200 latency=16ms request_id=6f1c33 trace_id=1011121314151617
2026-11-03T08:30:11.880Z WARN     [redis] dataset loading in memory host=redis-0.redis:6379 progress=64%
2026-11-03T08:30:12.402Z ERROR    [inventory] cache write failed: BusyLoadingError: Redis is loading the dataset in memory request_id=6f1c34 trace_id=1112131415161718
2026-11-03T08:30:12.660Z ERROR    [locks] lock wait timeout lock=stock:sku-1101 holder=worker-2 waiter=worker-3 timeout=3000ms request_id=6f1c35
2026-11-03T08:30:12.662Z ERROR    [inventory] POST /reserve status=500 latency=3004ms request_id=6f1c35 trace_id=1213141516171819 user=shop-22
2026-11-03T08:30:13.009Z INFO     [inventory] GET /health status=200 latency=2ms request_id=6f1c36
2026-11-03T08:30:14.500Z WARN     [gunicorn] worker timeout pid=27 worker=worker-2 timeout=30s
2026-11-03T08:30:14.640Z INFO     [gunicorn] booting worker pid=41 worker=worker-4
2026-11-03T08:30:15.112Z INFO     [locks] lock released lock=stock:sku-1101 holder=worker-2 reason=worker-restart
2026-11-03T08:30:15.660Z INFO     [redis] dataset loaded host=redis-0.redis:6379 keys=1840211 elapsed=10.4s
2026-11-03T08:30:16.020Z INFO     [inventory] POST /reserve sku=sku-1101 qty=1 status=200 latency=31ms request_id=6f1c37 trace_id=1314151617181920 user=shop-22
2026-11-03T08:30:17.441Z INFO     [inventory] GET /items/sku-1101 status=200 latency=9ms request_id=6f1c38 trace_id=1415161718192021`;

const KUBERNETES_OOM = `2026-11-03T22:10:00.000Z INFO  [kubelet] Started container billing-worker pod=billing-worker-6d8f7-x2k9q namespace=prod image=registry.local/billing:4.12.0
2026-11-03T22:10:02.315Z INFO  [billing] Starting BillingWorkerApplication v4.12.0 using Java 21.0.4 with PID 1
2026-11-03T22:10:02.316Z INFO  [billing] JVM options: -XX:MaxRAMPercentage=90.0 -XX:+UseG1GC container_memory_limit=1Gi
2026-11-03T22:10:06.840Z INFO  [billing] Started BillingWorkerApplication in 4.5 seconds
2026-11-03T22:10:07.002Z INFO  [billing] consumer subscribed topic=invoices.v2 group=billing partitions=6
2026-11-03T22:10:12.118Z INFO  [billing] batch processed invoices=500 latency=820ms trace_id=7e1a90b3c4d5e6f7
2026-11-03T22:10:18.402Z INFO  [billing] batch processed invoices=500 latency=860ms trace_id=7e1a90b3c4d5e6f8
2026-11-03T22:10:24.931Z INFO  [billing] monthly statement export started customer=enterprise-118 request_id=st-5521
2026-11-03T22:10:29.004Z WARN  [gc] G1 Evacuation Pause young heap_before=702M heap_after=655M pause=184ms
2026-11-03T22:10:33.610Z INFO  [billing] batch processed invoices=500 latency=1430ms trace_id=7e1a90b3c4d5e6f9
2026-11-03T22:10:38.225Z WARN  [gc] G1 Evacuation Pause mixed heap_before=890M heap_after=861M pause=412ms
2026-11-03T22:10:41.017Z WARN  [billing] statement export holding rows=1840000 in memory request_id=st-5521
2026-11-03T22:10:44.902Z WARN  [gc] Pause Full (G1 Compaction Pause) heap_before=918M heap_after=912M pause=2210ms
2026-11-03T22:10:47.330Z ERROR [billing] Exception in thread "statement-export-1" java.lang.OutOfMemoryError: Java heap space
	at java.base/java.util.Arrays.copyOf(Arrays.java:3537)
	at java.base/java.util.ArrayList.grow(ArrayList.java:237)
	at com.acme.billing.export.StatementExporter.collectRows(StatementExporter.java:88)
	at com.acme.billing.export.StatementExporter.export(StatementExporter.java:41)
2026-11-03T22:10:47.331Z ERROR [billing] statement export failed request_id=st-5521 customer=enterprise-118 error=OutOfMemoryError
2026-11-03T22:10:48.006Z WARN  [billing] consumer lag rising topic=invoices.v2 lag=4210
2026-11-03T22:10:49.120Z INFO  [kubelet] Liveness probe failed: Get "http://10.42.3.17:8080/actuator/health": context deadline exceeded pod=billing-worker-6d8f7-x2k9q
2026-11-03T22:10:50.441Z WARN  [kernel] memory cgroup out of memory: Killed process 4121 (java) total-vm=3021440kB anon-rss=1046528kB
2026-11-03T22:10:50.502Z ERROR [kubelet] Container billing-worker terminated reason=OOMKilled exitCode=137 pod=billing-worker-6d8f7-x2k9q restartCount=1
2026-11-03T22:10:50.510Z WARN  [kubelet] Back-off restarting failed container billing-worker pod=billing-worker-6d8f7-x2k9q
2026-11-03T22:10:51.002Z ERROR [invoices] downstream billing unavailable status=503 request_id=inv-9001 trace_id=7e1a90b3c4d5e700
2026-11-03T22:11:00.880Z INFO  [kubelet] Started container billing-worker pod=billing-worker-6d8f7-x2k9q restartCount=1
2026-11-03T22:11:03.402Z INFO  [billing] Started BillingWorkerApplication in 2.5 seconds
2026-11-03T22:11:03.990Z INFO  [billing] consumer rebalanced topic=invoices.v2 lag=6140
2026-11-03T22:11:04.300Z INFO  [billing] resuming statement export request_id=st-5521 customer=enterprise-118
2026-11-03T22:11:21.770Z WARN  [gc] Pause Full (G1 Compaction Pause) heap_before=920M heap_after=915M pause=2480ms
2026-11-03T22:11:24.004Z ERROR [billing] Exception in thread "statement-export-1" java.lang.OutOfMemoryError: Java heap space
2026-11-03T22:11:26.117Z ERROR [kubelet] Container billing-worker terminated reason=OOMKilled exitCode=137 pod=billing-worker-6d8f7-x2k9q restartCount=2
2026-11-03T22:11:26.130Z WARN  [kubelet] Back-off restarting failed container billing-worker pod=billing-worker-6d8f7-x2k9q backoff=20s
2026-11-03T22:11:30.009Z ERROR [invoices] downstream billing unavailable status=503 request_id=inv-9002 trace_id=7e1a90b3c4d5e701
2026-11-03T22:11:46.300Z INFO  [kubelet] Started container billing-worker pod=billing-worker-6d8f7-x2k9q restartCount=2
2026-11-03T22:11:49.020Z INFO  [billing] Started BillingWorkerApplication in 2.7 seconds
2026-11-03T22:11:49.500Z INFO  [billing] resuming statement export request_id=st-5521 customer=enterprise-118
2026-11-03T22:12:10.871Z ERROR [kubelet] Container billing-worker terminated reason=OOMKilled exitCode=137 pod=billing-worker-6d8f7-x2k9q restartCount=3
2026-11-03T22:12:10.880Z ERROR [kubelet] pod billing-worker-6d8f7-x2k9q status=CrashLoopBackOff backoff=40s
2026-11-03T22:12:11.402Z ERROR [alertmanager] alert firing name=KubePodCrashLooping namespace=prod pod=billing-worker-6d8f7-x2k9q severity=critical
2026-11-03T22:12:12.006Z WARN  [invoices] retry queue growing size=1820 oldest=81s`;

const TOKIO_PANIC = `2026-11-03T06:45:00.001Z  INFO ingest::server: listening addr=0.0.0.0:7070 service=ingest-gateway version=2.3.1
2026-11-03T06:45:00.002Z  INFO ingest::pipeline: worker pool started workers=8 runtime=tokio-multi-thread
2026-11-03T06:45:01.330Z  INFO ingest::http: request completed method=POST path=/v1/events status=202 latency=4ms request_id=01JC0A1 trace_id=9a8b7c6d5e4f3021
2026-11-03T06:45:01.802Z DEBUG ingest::batch: flushed batch size=512 sink=kafka partition=3
2026-11-03T06:45:02.114Z  INFO ingest::http: request completed method=POST path=/v1/events status=202 latency=5ms request_id=01JC0A2 trace_id=9a8b7c6d5e4f3022
2026-11-03T06:45:02.900Z  INFO ingest::http: request completed method=GET path=/healthz status=200 latency=0ms request_id=01JC0A3
2026-11-03T06:45:03.447Z  WARN ingest::schema: unknown field dropped field=client_hints tenant=acme-eu request_id=01JC0A4
2026-11-03T06:45:03.880Z  INFO ingest::http: request completed method=POST path=/v1/events status=202 latency=6ms request_id=01JC0A5 trace_id=9a8b7c6d5e4f3023
2026-11-03T06:45:04.512Z DEBUG ingest::batch: flushed batch size=512 sink=kafka partition=1
2026-11-03T06:45:05.007Z  WARN ingest::decode: payload with empty "events" array tenant=globex request_id=01JC0A6 trace_id=9a8b7c6d5e4f3024
thread 'tokio-runtime-worker' panicked at src/pipeline/batch.rs:142:38:
index out of bounds: the len is 0 but the index is 0
stack backtrace:
   0: rust_begin_unwind
             at /rustc/90b35a6239c3d8bdabc530a6a0816f7ff89a0aaf/library/std/src/panicking.rs:665:5
   1: core::panicking::panic_fmt
   2: core::panicking::panic_bounds_check
   3: ingest::pipeline::batch::Batch::first_timestamp
             at ./src/pipeline/batch.rs:142:38
   4: ingest::pipeline::worker::run::{{closure}}
             at ./src/pipeline/worker.rs:77:21
   5: tokio::runtime::task::core::Core<T,S>::poll
note: Some details are omitted, run with RUST_BACKTRACE=full for a verbose backtrace.
2026-11-03T06:45:05.009Z ERROR ingest::pipeline: worker task failed: JoinError::Panic(Id(41), "index out of bounds: the len is 0 but the index is 0") worker=3 request_id=01JC0A6
2026-11-03T06:45:05.010Z  WARN ingest::pipeline: worker pool degraded alive=7 workers=8
2026-11-03T06:45:05.330Z  INFO ingest::http: request completed method=POST path=/v1/events status=202 latency=7ms request_id=01JC0A7 trace_id=9a8b7c6d5e4f3025
2026-11-03T06:45:06.118Z ERROR ingest::http: request failed method=POST path=/v1/events status=500 latency=1ms error="channel closed" request_id=01JC0A8 trace_id=9a8b7c6d5e4f3026
2026-11-03T06:45:06.900Z  INFO ingest::http: request completed method=GET path=/healthz status=200 latency=0ms request_id=01JC0A9
2026-11-03T06:45:07.402Z  WARN ingest::decode: payload with empty "events" array tenant=globex request_id=01JC0AA trace_id=9a8b7c6d5e4f3027
thread 'tokio-runtime-worker' panicked at src/pipeline/batch.rs:142:38:
index out of bounds: the len is 0 but the index is 0
2026-11-03T06:45:07.404Z ERROR ingest::pipeline: worker task failed: JoinError::Panic(Id(57), "index out of bounds: the len is 0 but the index is 0") worker=5 request_id=01JC0AA
2026-11-03T06:45:07.405Z  WARN ingest::pipeline: worker pool degraded alive=6 workers=8
2026-11-03T06:45:08.020Z ERROR ingest::http: request failed method=POST path=/v1/events status=500 latency=1ms error="channel closed" request_id=01JC0AB trace_id=9a8b7c6d5e4f3028
2026-11-03T06:45:08.330Z  WARN ingest::batch: kafka backlog growing pending=18210 partition=3
2026-11-03T06:45:09.512Z  WARN ingest::decode: payload with empty "events" array tenant=globex request_id=01JC0AC trace_id=9a8b7c6d5e4f3029
thread 'tokio-runtime-worker' panicked at src/pipeline/batch.rs:142:38:
index out of bounds: the len is 0 but the index is 0
2026-11-03T06:45:09.514Z ERROR ingest::pipeline: worker task failed: JoinError::Panic(Id(63), "index out of bounds: the len is 0 but the index is 0") worker=0 request_id=01JC0AC
2026-11-03T06:45:09.515Z ERROR ingest::pipeline: worker pool below minimum alive=5 minimum=6
2026-11-03T06:45:10.002Z ERROR ingest::http: request failed method=POST path=/v1/events status=503 latency=0ms error="pipeline unavailable" request_id=01JC0AD trace_id=9a8b7c6d5e4f3030
2026-11-03T06:45:10.900Z  WARN ingest::server: readiness=false reason="worker pool below minimum"
2026-11-03T06:45:11.470Z ERROR ingest::http: request failed method=POST path=/v1/events status=503 latency=0ms error="pipeline unavailable" request_id=01JC0AE trace_id=9a8b7c6d5e4f3031
2026-11-03T06:45:12.118Z  INFO ingest::server: shutdown signal received, draining connections=42`;

const GRPC_CERTIFICATE = `2026-11-03T00:00:00.120Z INFO  [ledger-svc] grpc server listening addr=:9443 tls=mutual version=1.31.0
2026-11-03T00:00:01.402Z INFO  [ledger-svc] rpc ok method=/ledger.v1.Ledger/GetBalance code=OK latency=3ms peer=payments-svc trace_id=5e6f7081920a1b2c
2026-11-03T00:00:02.017Z INFO  [payments-svc] rpc ok method=/ledger.v1.Ledger/PostEntry code=OK latency=9ms request_id=pay-11a0 trace_id=6f7081920a1b2c3d
2026-11-03T00:00:03.556Z INFO  [ledger-svc] rpc ok method=/ledger.v1.Ledger/GetBalance code=OK latency=2ms peer=wallet-svc trace_id=7081920a1b2c3d4e
2026-11-03T00:00:04.900Z DEBUG [cert-agent] next rotation check in 1h cert=/etc/certs/ledger-client.pem not_after=2026-11-03T00:00:05Z
2026-11-03T00:00:05.330Z INFO  [payments-svc] POST /v1/charges status=201 latency=48ms request_id=pay-11a1 trace_id=81920a1b2c3d4e5f
2026-11-03T00:00:06.004Z WARN  [grpc] [core] addrConn.createTransport failed to connect to {Addr: "ledger-svc.prod.svc:9443"}. Err: connection error: desc = "transport: authentication handshake failed: tls: failed to verify certificate: x509: certificate has expired or is not yet valid: current time 2026-11-03T00:00:06Z is after 2026-11-03T00:00:05Z" service=payments-svc
2026-11-03T00:00:06.011Z ERROR [payments-svc] rpc failed method=/ledger.v1.Ledger/PostEntry code=Unavailable desc="connection error: desc = \\"transport: authentication handshake failed: x509: certificate has expired or is not yet valid\\"" request_id=pay-11a2 trace_id=920a1b2c3d4e5f60
2026-11-03T00:00:06.013Z ERROR [payments-svc] POST /v1/charges status=502 latency=31ms request_id=pay-11a2 trace_id=920a1b2c3d4e5f60 user=cus_8812
2026-11-03T00:00:06.402Z WARN  [ledger-svc] tls handshake error from 10.42.1.33:51870: remote error: tls: bad certificate
2026-11-03T00:00:06.990Z INFO  [ledger-svc] rpc ok method=/ledger.v1.Ledger/GetBalance code=OK latency=2ms peer=wallet-svc trace_id=a1b2c3d4e5f60718
2026-11-03T00:00:07.215Z WARN  [grpc] [balancer] subchannel state changed to TRANSIENT_FAILURE target=ledger-svc.prod.svc:9443 service=payments-svc
2026-11-03T00:00:07.620Z ERROR [payments-svc] rpc failed method=/ledger.v1.Ledger/PostEntry code=Unavailable desc="last connection error: transport: authentication handshake failed: x509: certificate has expired" request_id=pay-11a3 trace_id=b2c3d4e5f6071829
2026-11-03T00:00:07.622Z ERROR [payments-svc] POST /v1/charges status=502 latency=4ms request_id=pay-11a3 trace_id=b2c3d4e5f6071829 user=cus_1044
2026-11-03T00:00:08.300Z INFO  [payments-svc] GET /health status=200 latency=1ms request_id=pay-11a4
2026-11-03T00:00:08.844Z WARN  [ledger-svc] tls handshake error from 10.42.1.33:51874: remote error: tls: bad certificate
2026-11-03T00:00:09.410Z WARN  [grpc] retrying connection backoff=1.6s target=ledger-svc.prod.svc:9443 service=payments-svc
2026-11-03T00:00:10.006Z ERROR [payments-svc] rpc failed method=/ledger.v1.Ledger/PostEntry code=Unavailable desc="transport: authentication handshake failed: x509: certificate has expired" request_id=pay-11a5 trace_id=c3d4e5f607182930
2026-11-03T00:00:10.008Z ERROR [payments-svc] POST /v1/charges status=502 latency=3ms request_id=pay-11a5 trace_id=c3d4e5f607182930 user=cus_5530
2026-11-03T00:00:10.770Z INFO  [wallet-svc] rpc ok method=/ledger.v1.Ledger/GetBalance code=OK latency=3ms request_id=wal-3301 trace_id=d4e5f60718293041
2026-11-03T00:00:11.209Z WARN  [payments-svc] outbox growing pending=37 oldest=5.2s
2026-11-03T00:00:12.004Z ERROR [cert-agent] rotation failed cert=/etc/certs/ledger-client.pem error="vault: permission denied on pki/issue/payments" attempt=3
2026-11-03T00:00:12.402Z ERROR [payments-svc] rpc failed method=/ledger.v1.Ledger/PostEntry code=Unavailable desc="transport: authentication handshake failed: x509: certificate has expired" request_id=pay-11a6 trace_id=e5f6071829304152
2026-11-03T00:00:12.404Z ERROR [payments-svc] POST /v1/charges status=502 latency=2ms request_id=pay-11a6 trace_id=e5f6071829304152 user=cus_7781
2026-11-03T00:00:13.118Z INFO  [payments-svc] GET /health status=200 latency=1ms request_id=pay-11a7
2026-11-03T00:00:14.660Z WARN  [ledger-svc] tls handshake error from 10.42.1.33:51880: remote error: tls: bad certificate
2026-11-03T00:00:15.330Z ERROR [checkout-web] payment step failed status=502 request_id=web-88f1 trace_id=f607182930415263 upstream=payments-svc
2026-11-03T00:00:16.001Z ERROR [alertmanager] alert firing name=PaymentsErrorRate service=payments-svc rate=0.97 severity=critical
2026-11-03T00:00:16.950Z INFO  [wallet-svc] rpc ok method=/ledger.v1.Ledger/GetBalance code=OK latency=2ms request_id=wal-3302 trace_id=0718293041526374
2026-11-03T00:00:18.200Z WARN  [grpc] retrying connection backoff=4.1s target=ledger-svc.prod.svc:9443 service=payments-svc
2026-11-03T00:00:20.700Z ERROR [payments-svc] rpc failed method=/ledger.v1.Ledger/PostEntry code=Unavailable desc="transport: authentication handshake failed: x509: certificate has expired" request_id=pay-11a8 trace_id=1829304152637485
2026-11-03T00:00:20.702Z ERROR [payments-svc] POST /v1/charges status=502 latency=2ms request_id=pay-11a8 trace_id=1829304152637485 user=cus_2203
2026-11-03T00:00:21.400Z WARN  [payments-svc] outbox growing pending=96 oldest=15.4s
2026-11-03T00:00:22.004Z INFO  [payments-svc] GET /health status=200 latency=1ms request_id=pay-11a9`;

const EDGE_RATE_LIMIT = `2026-11-03T17:20:00.010Z INFO  [edge] GET /api/search?q=boots region=fra1 status=200 latency=212ms request_id=fra1::ab12-1001 trace_id=00f067aa0ba902b7
2026-11-03T17:20:00.640Z INFO  [next] GET /products/trail-runner status=200 cache=HIT latency=18ms request_id=fra1::ab12-1002
2026-11-03T17:20:01.118Z INFO  [edge] GET /api/search?q=jacket region=fra1 status=200 latency=240ms request_id=fra1::ab12-1003 trace_id=00f067aa0ba902b8
2026-11-03T17:20:01.904Z INFO  [next] GET /cart status=200 cache=MISS latency=96ms request_id=fra1::ab12-1004 user=v_7c21
2026-11-03T17:20:02.330Z INFO  [cron] price sync started job=price-sync batch=1/40 upstream=catalog-api
2026-11-03T17:20:02.881Z INFO  [edge] GET /api/search?q=socks region=fra1 status=200 latency=260ms request_id=fra1::ab12-1005 trace_id=00f067aa0ba902b9
2026-11-03T17:20:03.402Z WARN  [catalog-api] rate limit near quota used=4710 limit=5000 window=60s client=web-storefront
2026-11-03T17:20:04.006Z INFO  [next] GET /products/rain-shell status=200 cache=HIT latency=21ms request_id=fra1::ab12-1006
2026-11-03T17:20:04.770Z WARN  [catalog-api] upstream responded status=429 retry_after=30 client=web-storefront request_id=fra1::ab12-1007 trace_id=00f067aa0ba902ba
2026-11-03T17:20:04.772Z WARN  [edge] retrying upstream catalog-api attempt=1 backoff=200ms request_id=fra1::ab12-1007
2026-11-03T17:20:04.980Z WARN  [catalog-api] upstream responded status=429 retry_after=30 client=web-storefront request_id=fra1::ab12-1007 trace_id=00f067aa0ba902ba
2026-11-03T17:20:04.982Z WARN  [edge] retrying upstream catalog-api attempt=2 backoff=400ms request_id=fra1::ab12-1007
2026-11-03T17:20:05.390Z WARN  [catalog-api] upstream responded status=429 retry_after=29 client=web-storefront request_id=fra1::ab12-1007
2026-11-03T17:20:05.401Z INFO  [next] GET /account status=200 cache=MISS latency=88ms request_id=fra1::ab12-1008 user=v_1190
2026-11-03T17:20:06.120Z WARN  [cron] price sync slowed job=price-sync batch=9/40 status=429 retry_after=29
2026-11-03T17:20:07.004Z WARN  [catalog-api] upstream responded status=429 retry_after=27 client=web-storefront request_id=fra1::ab12-1009 trace_id=00f067aa0ba902bb
2026-11-03T17:20:07.006Z WARN  [edge] retrying upstream catalog-api attempt=1 backoff=200ms request_id=fra1::ab12-1009
2026-11-03T17:20:08.300Z INFO  [next] GET /products/trail-runner status=200 cache=HIT latency=19ms request_id=fra1::ab12-1010
2026-11-03T17:20:14.780Z ERROR [edge] Task timed out after 10.00 seconds code=EDGE_FUNCTION_INVOCATION_TIMEOUT path=/api/search region=fra1 status=504 request_id=fra1::ab12-1007 trace_id=00f067aa0ba902ba
2026-11-03T17:20:14.781Z ERROR [next] GET /api/search?q=gloves status=504 latency=10004ms error=EDGE_FUNCTION_INVOCATION_TIMEOUT request_id=fra1::ab12-1007
2026-11-03T17:20:15.200Z WARN  [catalog-api] upstream responded status=429 retry_after=19 client=web-storefront request_id=fra1::ab12-1011 trace_id=00f067aa0ba902bc
2026-11-03T17:20:17.010Z ERROR [edge] Task timed out after 10.00 seconds code=EDGE_FUNCTION_INVOCATION_TIMEOUT path=/api/search region=fra1 status=504 request_id=fra1::ab12-1009 trace_id=00f067aa0ba902bb
2026-11-03T17:20:17.011Z ERROR [next] GET /api/search?q=hat status=504 latency=10005ms error=EDGE_FUNCTION_INVOCATION_TIMEOUT request_id=fra1::ab12-1009
2026-11-03T17:20:17.660Z INFO  [next] GET /cart status=200 cache=MISS latency=104ms request_id=fra1::ab12-1012 user=v_7c21
2026-11-03T17:20:18.402Z WARN  [cron] price sync paused job=price-sync batch=14/40 status=429 retry_after=16
2026-11-03T17:20:20.009Z ERROR [edge] Unhandled rejection: FetchError: upstream catalog-api responded 429 Too Many Requests path=/api/recommendations request_id=fra1::ab12-1013 trace_id=00f067aa0ba902bd
    at fetchCatalog (/var/task/.next/server/edge-chunks/412.js:1:8812)
    at async GET (/var/task/.next/server/app/api/recommendations/route.js:1:2290)
2026-11-03T17:20:20.011Z ERROR [next] GET /api/recommendations status=500 latency=640ms request_id=fra1::ab12-1013
2026-11-03T17:20:21.330Z INFO  [next] GET /products/rain-shell status=200 cache=HIT latency=20ms request_id=fra1::ab12-1014
2026-11-03T17:20:24.820Z ERROR [edge] Task timed out after 10.00 seconds code=EDGE_FUNCTION_INVOCATION_TIMEOUT path=/api/search region=fra1 status=504 request_id=fra1::ab12-1011 trace_id=00f067aa0ba902bc
2026-11-03T17:20:24.900Z ERROR [monitor] synthetic check failed check=search-p95 latency=10004ms threshold=1500ms region=fra1
2026-11-03T17:20:30.010Z INFO  [catalog-api] rate limit window reset used=0 limit=5000 client=web-storefront
2026-11-03T17:20:30.640Z INFO  [cron] price sync resumed job=price-sync batch=14/40
2026-11-03T17:20:31.118Z INFO  [edge] GET /api/search?q=gloves region=fra1 status=200 latency=231ms request_id=fra1::ab12-1015 trace_id=00f067aa0ba902be
2026-11-03T17:20:33.402Z WARN  [catalog-api] rate limit near quota used=4820 limit=5000 window=60s client=web-storefront
2026-11-03T17:20:34.004Z INFO  [next] GET /cart status=200 cache=MISS latency=91ms request_id=fra1::ab12-1016 user=v_5512`;

export const PRESET_LOGS: Record<PresetId, string> = {
  prismaPool: PRISMA_POOL,
  fastapiRedis: FASTAPI_REDIS,
  kubernetesOom: KUBERNETES_OOM,
  tokioPanic: TOKIO_PANIC,
  grpcCertificate: GRPC_CERTIFICATE,
  edgeRateLimit: EDGE_RATE_LIMIT,
};
