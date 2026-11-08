/**
 * Real-world log shapes, one small sample each. A sample says which lines are failures (they must
 * become anomalies with a time when the format has one) and which are healthy (they must not).
 * It checks that no common format is invisible to the analysis.
 */
export interface CorpusSample {
  name: string;
  log: string;
  /** Text of lines that are failures. */
  failures: string[];
  /** Text of lines that are healthy. */
  healthy: string[];
  /** True when the format carries a time that the parser must read. */
  hasTime: boolean;
}

export const FORMAT_CORPUS: CorpusSample[] = [
  {
    name: 'Apache error log',
    log: [
      '[Wed Nov 04 10:00:01.123456 2026] [core:notice] [pid 1:tid 1] AH00094: Command line: /usr/sbin/apache2',
      '[Wed Nov 04 10:00:05.000000 2026] [php:error] [pid 811] [client 10.0.0.9:51234] PHP Fatal error: Uncaught Error: Call to undefined function foo() in /var/www/index.php:12',
    ].join('\n'),
    failures: ['Call to undefined function foo'],
    healthy: ['Command line'],
    hasTime: true,
  },
  {
    name: 'Nginx error log',
    log: [
      '2026/11/04 10:00:00 [notice] 1#1: nginx/1.25.3',
      '2026/11/04 10:00:07 [error] 29#29: *3 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 10.0.0.4',
    ].join('\n'),
    failures: ['upstream timed out'],
    healthy: ['nginx/1.25.3'],
    hasTime: true,
  },
  {
    name: 'Syslog RFC 3164',
    log: [
      'Nov  4 10:00:00 web1 systemd[1]: Started Daily apt download activities.',
      'Nov  4 10:00:09 web1 kernel: [1234.5] Out of memory: Killed process 4411 (java) total-vm:8123456kB',
    ].join('\n'),
    failures: ['Out of memory'],
    healthy: ['Started Daily apt'],
    hasTime: true,
  },
  {
    name: 'Syslog RFC 5424',
    log: [
      '<165>1 2026-11-04T10:00:00.003Z web1 app 2201 ID47 [exampleSDID@32473 iut="3"] request served',
      '<163>1 2026-11-04T10:00:02.100Z web1 app 2201 ID48 - database connection failed: timeout',
    ].join('\n'),
    failures: ['database connection failed'],
    healthy: ['request served'],
    hasTime: true,
  },
  {
    name: 'systemd journal (journalctl)',
    log: [
      'Nov 04 10:00:00 web1 systemd[1]: Started Nginx Web Server.',
      'Nov 04 10:00:04 web1 systemd[1]: nginx.service: Main process exited, code=exited, status=1/FAILURE',
      "Nov 04 10:00:04 web1 systemd[1]: nginx.service: Failed with result 'exit-code'.",
    ].join('\n'),
    failures: ['Failed with result'],
    healthy: ['Started Nginx Web Server'],
    hasTime: true,
  },
  {
    name: 'Kubernetes klog',
    log: [
      'I1104 10:00:00.123456       1 server.go:123] Starting controller',
      'E1104 10:00:03.654321       1 reflector.go:138] failed to list *v1.Pod: connection refused',
    ].join('\n'),
    failures: ['failed to list'],
    healthy: ['Starting controller'],
    hasTime: true,
  },
  {
    name: 'Docker json-file',
    log: [
      '{"log":"server started on :8080\\n","stream":"stdout","time":"2026-11-04T10:00:00.000000000Z"}',
      '{"log":"panic: runtime error: index out of range [3] with length 3\\n","stream":"stderr","time":"2026-11-04T10:00:03.000000000Z"}',
    ].join('\n'),
    failures: ['panic: runtime error'],
    healthy: ['server started'],
    hasTime: true,
  },
  {
    name: 'Kubernetes CRI (containerd)',
    log: [
      '2026-11-04T10:00:00.000000000Z stdout F listening on port 8080',
      '2026-11-04T10:00:02.000000000Z stderr F Error: connect ECONNREFUSED 10.1.2.3:5432',
    ].join('\n'),
    failures: ['connect ECONNREFUSED'],
    healthy: ['listening on port'],
    hasTime: true,
  },
  {
    name: 'Logback / Spring Boot',
    log: [
      '2026-11-04 10:00:00.123  INFO 1 --- [           main] c.e.demo.DemoApplication                 : Started DemoApplication in 3.2 seconds',
      '2026-11-04 10:00:05.456 ERROR 1 --- [nio-8080-exec-1] o.a.c.c.C.[.[.[/].[dispatcherServlet]    : Servlet.service() for servlet [dispatcherServlet] threw exception',
      'java.lang.NullPointerException: Cannot invoke "String.length()" because "s" is null',
      '\tat com.example.demo.Controller.handle(Controller.java:42)',
    ].join('\n'),
    failures: ['threw exception'],
    healthy: ['Started DemoApplication'],
    hasTime: true,
  },
  {
    name: 'Log4j with thread',
    log: [
      '2026-11-04 10:00:00,123 INFO  [main] com.acme.App - boot complete',
      '2026-11-04 10:00:01,456 FATAL [pool-2-thread-1] com.acme.Db - cannot get JDBC connection',
    ].join('\n'),
    failures: ['cannot get JDBC connection'],
    healthy: ['boot complete'],
    hasTime: true,
  },
  {
    name: 'Python logging',
    log: [
      '2026-11-04 10:00:00,100 - app.worker - INFO - job started id=7',
      '2026-11-04 10:00:03,200 - app.worker - ERROR - job failed id=7',
      'Traceback (most recent call last):',
      '  File "/app/worker.py", line 10, in run',
      '    1 / 0',
      'ZeroDivisionError: division by zero',
    ].join('\n'),
    failures: ['job failed id=7'],
    healthy: ['job started id=7'],
    hasTime: true,
  },
  {
    name: 'Go logrus (logfmt)',
    log: [
      'time="2026-11-04T10:00:00Z" level=info msg="server ready" port=8080',
      'time="2026-11-04T10:00:02Z" level=error msg="failed to dial upstream" addr="10.0.0.7:9000" err="connection refused"',
    ].join('\n'),
    failures: ['failed to dial upstream'],
    healthy: ['server ready'],
    hasTime: true,
  },
  {
    name: 'Go zap (JSON)',
    log: [
      '{"level":"info","ts":1730714400.123,"caller":"srv/main.go:20","msg":"started"}',
      '{"level":"error","ts":1730714403.456,"caller":"srv/db.go:55","msg":"query failed","error":"deadlock detected"}',
    ].join('\n'),
    failures: ['query failed'],
    healthy: ['started'],
    hasTime: true,
  },
  {
    name: 'pino (numeric levels)',
    log: [
      '{"level":30,"time":1730714400123,"pid":1,"hostname":"api-1","msg":"request completed"}',
      '{"level":50,"time":1730714402456,"pid":1,"hostname":"api-1","msg":"unhandled rejection","err":{"type":"Error","message":"boom"}}',
    ].join('\n'),
    failures: ['unhandled rejection'],
    healthy: ['request completed'],
    hasTime: true,
  },
  {
    name: 'Ruby on Rails',
    log: [
      'I, [2026-11-04T10:00:00.123456 #1]  INFO -- : Started GET "/" for 10.0.0.1',
      "F, [2026-11-04T10:00:00.456789 #1] FATAL -- : ActionView::Template::Error (undefined method `name' for nil:NilClass):",
    ].join('\n'),
    failures: ['ActionView::Template::Error'],
    healthy: ['Started GET'],
    hasTime: true,
  },
  {
    name: 'PHP / Laravel',
    log: [
      '[2026-11-04 10:00:00] production.INFO: user logged in {"id":5}',
      '[2026-11-04 10:00:04] production.ERROR: SQLSTATE[HY000] [2002] Connection refused (SQL: select * from users) {"exception":"[object] (PDOException(code: 2002))"}',
    ].join('\n'),
    failures: ['SQLSTATE[HY000]'],
    healthy: ['user logged in'],
    hasTime: true,
  },
  {
    name: 'PostgreSQL log',
    log: [
      '2026-11-04 10:00:00.123 UTC [41] LOG:  database system is ready to accept connections',
      '2026-11-04 10:00:03.456 UTC [88] ERROR:  relation "orders" does not exist at character 15',
    ].join('\n'),
    failures: ['relation "orders" does not exist'],
    healthy: ['ready to accept connections'],
    hasTime: true,
  },
  {
    name: 'MySQL error log',
    log: [
      '2026-11-04T10:00:00.123456Z 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections.',
      "2026-11-04T10:00:02.654321Z 12 [Warning] [MY-010055] [Server] IP address '10.0.0.5' could not be resolved",
      '2026-11-04T10:00:05.000000Z 13 [ERROR] [MY-013183] [InnoDB] Assertion failure: page0cur.cc:1234',
    ].join('\n'),
    failures: ['Assertion failure'],
    healthy: ['ready for connections'],
    hasTime: true,
  },
  {
    name: 'MongoDB structured log',
    log: [
      '{"t":{"$date":"2026-11-04T10:00:00.123+00:00"},"s":"I","c":"NETWORK","id":22943,"ctx":"listener","msg":"Connection accepted"}',
      '{"t":{"$date":"2026-11-04T10:00:03.456+00:00"},"s":"E","c":"STORAGE","id":22435,"ctx":"initandlisten","msg":"WiredTiger error","attr":{"error":"Input/output error"}}',
    ].join('\n'),
    failures: ['WiredTiger error'],
    healthy: ['Connection accepted'],
    hasTime: true,
  },
  {
    name: 'Redis',
    log: [
      '1:M 04 Nov 2026 10:00:00.123 * Ready to accept connections',
      '1:M 04 Nov 2026 10:00:04.456 # Out Of Memory: command not allowed when used memory > maxmemory',
    ].join('\n'),
    failures: ['Out Of Memory'],
    healthy: ['Ready to accept connections'],
    hasTime: true,
  },
  {
    name: 'Elasticsearch',
    log: [
      '[2026-11-04T10:00:00,123][INFO ][o.e.n.Node               ] [node-1] started',
      '[2026-11-04T10:00:04,456][ERROR][o.e.b.ElasticsearchUncaughtExceptionHandler] [node-1] fatal error in thread [main]',
    ].join('\n'),
    failures: ['fatal error in thread'],
    healthy: ['started'],
    hasTime: true,
  },
  {
    name: 'Kafka (log4j)',
    log: [
      '[2026-11-04 10:00:00,123] INFO [KafkaServer id=0] started (kafka.server.KafkaServer)',
      '[2026-11-04 10:00:02,456] ERROR [ReplicaManager broker=0] Error processing append operation on partition orders-0 (kafka.server.ReplicaManager)',
    ].join('\n'),
    failures: ['Error processing append operation'],
    healthy: ['started'],
    hasTime: true,
  },
  {
    name: 'HAProxy',
    log: [
      'Nov  4 10:00:00 lb haproxy[12]: 10.0.0.9:51000 [04/Nov/2026:10:00:00.123] fe be/app1 0/0/1/12/13 200 512 - - ---- 1/1/0/0/0 0/0 "GET /ok HTTP/1.1"',
      'Nov  4 10:00:03 lb haproxy[12]: 10.0.0.9:51002 [04/Nov/2026:10:00:03.456] fe be/app1 0/0/-1/-1/30001 504 194 - - sH-- 1/1/0/0/0 0/0 "GET /slow HTTP/1.1"',
    ].join('\n'),
    failures: ['GET /slow'],
    healthy: ['GET /ok'],
    hasTime: true,
  },
  {
    name: 'AWS ALB access log',
    log: [
      'http 2026-11-04T10:00:00.123456Z app/my-lb/50dc6c495c0c9188 10.0.0.9:51000 10.0.1.5:80 0.001 0.002 0.000 200 200 34 366 "GET http://my-lb.example.com:80/ok HTTP/1.1" "curl/8" - -',
      'http 2026-11-04T10:00:03.123456Z app/my-lb/50dc6c495c0c9188 10.0.0.9:51002 10.0.1.5:80 0.001 5.002 0.000 502 502 34 366 "GET http://my-lb.example.com:80/bad HTTP/1.1" "curl/8" - -',
    ].join('\n'),
    failures: ['/bad HTTP'],
    healthy: ['/ok HTTP'],
    hasTime: true,
  },
  {
    name: 'IIS W3C extended',
    log: [
      '#Software: Microsoft Internet Information Services 10.0',
      '#Fields: date time s-ip cs-method cs-uri-stem sc-status time-taken',
      '2026-11-04 10:00:00 10.0.0.1 GET /index.html 200 15',
      '2026-11-04 10:00:03 10.0.0.1 POST /api/pay 500 1200',
    ].join('\n'),
    failures: ['/api/pay 500'],
    healthy: ['/index.html 200'],
    hasTime: true,
  },
  {
    name: 'Windows Event (text)',
    log: [
      'Log Name:      Application',
      'Source:        Application Error',
      'Date:          11/4/2026 10:00:03 AM',
      'Event ID:      1000',
      'Level:         Error',
      'Description:   Faulting application name: app.exe, version: 1.0.0.0, faulting module: ntdll.dll',
    ].join('\n'),
    failures: ['Faulting application name'],
    healthy: [],
    hasTime: true,
  },
  {
    name: 'Android logcat',
    log: [
      '11-04 10:00:00.123  1234  1234 I ActivityManager: Start proc com.example.app',
      '11-04 10:00:03.456  1234  1250 E AndroidRuntime: FATAL EXCEPTION: main',
    ].join('\n'),
    failures: ['FATAL EXCEPTION'],
    healthy: ['Start proc'],
    hasTime: true,
  },
  {
    name: '.NET / Serilog',
    log: [
      '[10:00:00 INF] Application started. Press Ctrl+C to shut down.',
      '[10:00:04 ERR] Unhandled exception. System.InvalidOperationException: Sequence contains no elements',
    ].join('\n'),
    failures: ['Unhandled exception'],
    healthy: ['Application started'],
    hasTime: false,
  },
  {
    name: 'Node console without time',
    log: [
      'Server listening on 3000',
      "Error: ENOENT: no such file or directory, open '/app/config.json'",
      '    at Object.openSync (node:fs:601:3)',
    ].join('\n'),
    failures: ['ENOENT'],
    healthy: ['Server listening'],
    hasTime: false,
  },
  {
    name: 'Docker Compose prefixed lines',
    log: [
      'web_1  | listening on 8080',
      'db_1   | FATAL:  password authentication failed for user "app"',
    ].join('\n'),
    failures: ['password authentication failed'],
    healthy: ['listening on 8080'],
    hasTime: false,
  },
  {
    name: 'Epoch-prefixed lines',
    log: [
      '1730714400 INFO worker booted',
      '1730714403 ERROR queue consumer crashed: out of memory',
    ].join('\n'),
    failures: ['queue consumer crashed'],
    healthy: ['worker booted'],
    hasTime: true,
  },
  {
    name: 'CSV-style access log',
    log: [
      '2026-11-04T10:00:00Z,GET,/home,200,12',
      '2026-11-04T10:00:02Z,POST,/checkout,503,3000',
    ].join('\n'),
    failures: ['/checkout,503'],
    healthy: ['/home,200'],
    hasTime: true,
  },
  {
    name: 'Terraform / CI output',
    log: [
      'Initializing the backend...',
      'Error: Error acquiring the state lock',
      '',
      'Error message: ConditionalCheckFailedException: The conditional request failed',
    ].join('\n'),
    failures: ['Error acquiring the state lock'],
    healthy: ['Initializing the backend'],
    hasTime: false,
  },
  {
    name: 'GitHub Actions',
    log: [
      '2026-11-04T10:00:00.1234567Z ##[group]Run npm test',
      '2026-11-04T10:00:05.7654321Z ##[error]Process completed with exit code 1.',
    ].join('\n'),
    failures: ['Process completed with exit code 1'],
    healthy: ['Run npm test'],
    hasTime: true,
  },

  {
    name: 'ANSI colour codes',
    log: [
      '\u001b[32mINFO\u001b[0m server up on :3000',
      '\u001b[31mERROR\u001b[0m db connection failed: timeout',
    ].join('\n'),
    failures: ['db connection failed'],
    healthy: ['server up'],
    hasTime: false,
  },
  {
    name: 'Byte order mark at the start',
    log: [
      '\ufeff2026-11-04T10:00:00Z INFO [api] started',
      '2026-11-04T10:00:03Z ERROR [api] boom code=E7',
    ].join('\n'),
    failures: ['boom code=E7'],
    healthy: ['started'],
    hasTime: true,
  },
  {
    name: 'Docker Compose with timestamps',
    log: [
      'web_1  | 2026-11-04T10:00:00Z INFO listening',
      'web_1  | 2026-11-04T10:00:02Z ERROR cannot bind port 8080',
    ].join('\n'),
    failures: ['cannot bind port'],
    healthy: ['listening'],
    hasTime: true,
  },
  {
    name: 'Pretty-printed JSON event',
    log: [
      '{',
      '  "level": "error",',
      '  "message": "payment gateway timeout",',
      '  "timestamp": "2026-11-04T10:00:00Z"',
      '}',
      '{',
      '  "level": "info",',
      '  "message": "heartbeat",',
      '  "timestamp": "2026-11-04T10:00:05Z"',
      '}',
    ].join('\n'),
    failures: ['payment gateway timeout'],
    healthy: ['heartbeat'],
    hasTime: true,
  },
  {
    name: 'Heroku router',
    log: [
      '2026-11-04T10:00:00.123456+00:00 heroku[router]: at=info method=GET path="/" host=app.example.com request_id=r1 status=200 bytes=512',
      '2026-11-04T10:00:03.123456+00:00 heroku[router]: at=error code=H12 desc="Request timeout" method=GET path="/slow" host=app.example.com request_id=r2 status=503 bytes=0',
    ].join('\n'),
    failures: ['code=H12'],
    healthy: ['request_id=r1'],
    hasTime: true,
  },
  {
    name: 'Bracketed level with date',
    log: [
      '[2026-11-04 10:00:00] [INFO] cache warmed',
      '[2026-11-04 10:00:02] [ERROR] cache miss storm on key user:42',
    ].join('\n'),
    failures: ['cache miss storm'],
    healthy: ['cache warmed'],
    hasTime: true,
  },
  {
    name: 'journald JSON export',
    log: [
      '{"__REALTIME_TIMESTAMP":"1730714400123456","PRIORITY":"6","MESSAGE":"Started app.service","_SYSTEMD_UNIT":"init.scope"}',
      '{"__REALTIME_TIMESTAMP":"1730714403123456","PRIORITY":"3","MESSAGE":"Failed to start app.service","_SYSTEMD_UNIT":"init.scope"}',
    ].join('\n'),
    failures: ['Failed to start app.service'],
    healthy: ['Started app.service'],
    hasTime: true,
  },
  {
    name: 'Go panic with goroutine dump',
    log: [
      'panic: assignment to entry in nil map',
      '',
      'goroutine 1 [running]:',
      'main.main()',
      '\t/app/main.go:5 +0x18',
      'exit status 2',
    ].join('\n'),
    failures: ['assignment to entry in nil map'],
    healthy: [],
    hasTime: false,
  },
  {
    name: 'Rust panic',
    log: [
      "thread 'main' panicked at src/main.rs:2:5:",
      'called `Option::unwrap()` on a `None` value',
      'note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace',
    ].join('\n'),
    failures: ['panicked at src/main.rs'],
    healthy: [],
    hasTime: false,
  },
  {
    name: 'Healthy lines that mention errors',
    log: [
      '2026-11-04T10:00:00Z INFO [metrics] errors=0 failed=0 succeeded=120',
      '2026-11-04T10:00:01Z INFO [sre] error budget remaining 99.9%',
      '2026-11-04T10:00:02Z INFO [batch] finished with no errors',
      '2026-11-04T10:00:03Z DEBUG [retry] max_failures: 0, backoff enabled',
      '2026-11-04T10:00:04Z ERROR [api] real failure code=E9',
    ].join('\n'),
    failures: ['real failure code=E9'],
    healthy: ['errors=0 failed=0', 'error budget', 'no errors', 'max_failures: 0'],
    hasTime: true,
  },
  {
    name: 'IIS without a #Fields header',
    log: [
      '2023-10-05 14:27:10 172.16.0.1 200 GET /index.html - 80 - 203.0.113.10',
      '2023-10-05 14:27:12 172.16.0.1 500 GET /api/orders - 80 - 203.0.113.10',
      '2023-10-24 15:11:46 404 GET /img/logo.png - Not Found',
    ].join('\n'),
    failures: ['/api/orders', 'logo.png'],
    healthy: ['/index.html'],
    hasTime: true,
  },
  {
    name: 'Varnish backend health',
    log: [
      'Backend server 192.168.0.1 is healthy.',
      'Backend server 192.168.0.2 is unhealthy, disabling.',
    ].join('\n'),
    failures: ['is unhealthy'],
    healthy: ['is healthy'],
    hasTime: false,
  },
  {
    name: 'CouchDB access without a byte count',
    log: [
      '192.168.1.5 - - [30/Oct/2023:12:18:14 +0000] "GET /mydb/doc1 HTTP/1.1" 200',
      '192.168.1.5 - - [30/Oct/2023:12:18:15 +0000] "PUT /mydb/doc1 HTTP/1.1" 409 Conflict',
    ].join('\n'),
    failures: ['409 Conflict'],
    healthy: ['"GET /mydb/doc1 HTTP/1.1" 200'],
    hasTime: true,
  },
  {
    name: 'Memcached bare ERROR line',
    log: [
      'Memcached started on port 11211',
      'Slab class 1: chunk size 96 perslab 10922',
      'ERROR: Memory limit reached - allocation failed for 256 bytes',
    ].join('\n'),
    failures: ['Memory limit reached'],
    healthy: ['Memcached started'],
    hasTime: false,
  },
  {
    name: 'Linux kernel hung tasks',
    log: [
      'Oct 23 14:15:20 host kernel: [12340.1] eth0: link up',
      'Oct 23 14:15:30 host kernel: [12345.6] INFO: task sshd:2567 blocked for more than 120 seconds.',
      'Oct 23 14:15:35 host kernel: [12345.7] watchdog: BUG: soft lockup - CPU#0 stuck for 23s!',
    ].join('\n'),
    failures: ['blocked for more than 120 seconds', 'soft lockup'],
    healthy: ['link up'],
    hasTime: true,
  },
  {
    name: 'Oracle alert log',
    log: [
      '2023-10-03 10:15:30.001: Starting ORACLE instance (normal)',
      '2023-10-03 10:15:32.123: Errors in file /u01/app/oracle/trace/testdb_ora_1234.trc',
    ].join('\n'),
    failures: ['Errors in file'],
    healthy: ['Starting ORACLE instance'],
    hasTime: true,
  },
  {
    name: 'Oracle ORA errors',
    log: [
      '2023-10-01 10:15:40.001: Database mounted in exclusive mode',
      '2023-10-01 10:15:42.123: ORA-00001: unique constraint (SYS.SYS_C0012345) violated',
      "2023-10-01 10:15:43.456: Rollback segment 'RBS1' is full.",
    ].join('\n'),
    failures: ['ORA-00001', 'is full'],
    healthy: ['Database mounted'],
    hasTime: true,
  },
  {
    name: 'RabbitMQ bracketed level before the time',
    log: [
      '[info] 2023-10-12 14:27:00: accepting AMQP connection <0.123.0>',
      '[warn] 2023-10-12 14:27:03: Low memory warning: free memory under the watermark',
    ].join('\n'),
    failures: ['Low memory warning'],
    healthy: ['accepting AMQP connection'],
    hasTime: true,
  },
  {
    name: 'Kubernetes events table',
    log: [
      'Normal   Scheduled   pod/nginx-6544d6d7f8-lmh68   Successfully assigned default/nginx to node-1',
      'Warning  Failed      pod/nginx-6544d6d7f8-lmh68   Error: ErrImagePull',
      'Normal   BackOff     pod/nginx-6544d6d7f8-lmh68   Back-off pulling image "nginx:latest"',
    ].join('\n'),
    failures: ['ErrImagePull', 'Back-off pulling image'],
    healthy: ['Successfully assigned'],
    hasTime: false,
  },
  {
    name: 'auditd denied syscall',
    log: [
      'type=SYSCALL msg=audit(1697395200.123:35): arch=c000003e syscall=2 success=yes exit=3 a0=7ffe pid=1234 uid=0',
      'type=SYSCALL msg=audit(1697395202.789:36): arch=c000003e syscall=257 success=no exit=-13 a0=2b pid=1235 uid=1001',
    ].join('\n'),
    failures: ['success=no exit=-13'],
    healthy: ['success=yes exit=3'],
    hasTime: true,
  },
];
