# Benchmarks

The analysis engine is measured against realistic logs with known answers. No paid API is needed:
the deterministic engine is scored, so a run is repeatable and free.

```bash
cd server
npm run benchmark      # prints the table and writes benchmarks/results/latest.json
npm test               # the same scenarios as assertions (benchmarks/benchmarks.test.ts)
```

## Scenarios (`server/benchmarks/`)

Each scenario is a log plus what a correct analysis finds. Expectations point at events by a
marker (a piece of text of one event), never by line number, and the markers are never given to the
analyser.

| #   | Scenario                                        | What it checks                                               |
| --- | ----------------------------------------------- | ------------------------------------------------------------ |
| 1   | Single Node error                               | One exception with its stack and the 500 of the same request |
| 2   | Database error with consequences                | A dependency failing, the application failing because of it  |
| 3   | Multi-line stack trace                          | A Java trace with `Caused by` stays one event                |
| 4   | JSON lines and Nginx in one file                | Mixed formats read correctly                                 |
| 5   | Out-of-order timestamps                         | The cause is written after its effects                       |
| 6   | Different time zones                            | UTC+2, UTC-5 and UTC ordered by instant                      |
| 7   | Independent incidents                           | Three unrelated problems stay three incidents                |
| 8   | No real errors                                  | The right answer is no incident                              |
| 9   | Prompt injection in an event                    | Reported, not obeyed, and the real failure is still found    |
| 10  | Configuration error causing downstream problems | A changed value reported by the failures                     |
| 11  | HTTP 409 unrelated to the network               | No network claim, low severity, no forced cause              |
| 12  | Thousands of routine events                     | Noise counted, one real failure found, fast                  |
| 13  | Partially malformed file                        | Nothing crashes, nothing is lost                             |
| 14  | Missing data                                    | `insufficient`, not a guess                                  |
| 15  | **TTL regression** (mandatory)                  | See below                                                    |

**TTL regression.** A deployment changes `reservation.ttlMs` from 900000 to 900 ms. Reservations
expire early, checkout answers HTTP 409, fulfillment fails, and five orders are paid without being
fulfilled. Unrelated storage timeouts fill the same log, in five formats and two time zones with
late-arriving lines. Expected: the configuration change is the **confirmed** root cause, the five
orders are linked to it, and the storage timeouts are a separate incident with an `insufficient`
root cause. The system prompt and the model input contain none of the words of the solution
(`ttl`, `reservation`, `expired`, `900`); a test checks it.

## With a real model

`npm run benchmark:live -- --yes` (in `server/`, any shell, including Windows cmd) sends the TTL scenario through the hybrid
provider with your own OpenAI key from `server/.env`. It costs a few cents, so it is never part of the
tests or the CI. It prints whether the model answered, what the Evidence Validator corrected and the
incidents. Not run yet: it needs a key that only you should enter.

## Log formats

`benchmarks/fixtures/formatCorpus.ts` holds 44 small real-world shapes: Apache and nginx, syslog 3164 and
5424, journald (text and JSON), klog, Docker json-file and compose, CRI, Logback, Log4j, Python, logrus,
zap, pino, Rails, Laravel, PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, Kafka, HAProxy, AWS ALB, IIS
W3C, Windows events, Android logcat, Serilog, Heroku, GitHub Actions, pretty-printed JSON, ANSI-coloured
output, files with a byte order mark, Go and Rust panics, and healthy lines that mention errors
("errors=0"). Each sample says which lines must become incidents and which must not
(`benchmarks/formatCorpus.test.ts`). The same samples are also joined into one file and shuffled
(`every format in one file`): every failure must still be found.

Known limit: a line with no time and no marker of its own (a bare "Server listening on 3000") in a file
where most lines have a time is read as the continuation of the line before it, since that is what a
stack trace or a multi-line message looks like.

## Logs invented by a model (`npm run benchmark:generate -- --yes`)

The corpus above was written by people who also tuned the engine, so a perfect score there proves little.
The honest test lets a real model invent snippets from systems nobody tuned for (Oracle, Varnish, auditd,
RabbitMQ, kernel, sudo, Kubernetes events...), say which lines are failures, and checks that the engine finds
them. It costs a few cents, needs your own key and never runs in CI. Three runs on 2026-11-08, each a fresh
batch of 48 snippets:

| Run | Failure lines found | Healthy lines flagged |
| --- | ------------------- | --------------------- |
| 1   | 34 of 44 (77%)      | 1 of 116              |
| 2   | 34 of 41 (83%)      | 3 of 113              |
| 3   | 35 of 40 (88%)      | 7 of 109              |

Between runs every miss was added to the corpus and fixed (IIS without a header, Varnish, CouchDB, kernel
hung tasks, Oracle errors, RabbitMQ, Kubernetes events, auditd), so the next batch is a new test and the
score rises only if the fixes generalise. The model's labels are not perfect: most remaining "misses" are
doubtful (a graceful shutdown, a kernel taint line that belongs to the previous message) and most "flagged
healthy lines" are WARN-level lines that the engine reports as low-severity incidents on purpose. Coverage
of log shapes is therefore good, not complete: expect a few failures in an unfamiliar format to go unseen.

`npm run benchmark:ai -- --yes` asks the model to find the failures in each of the corpus samples and
compares it with the engine (both found 44 of 44 at the time, with no healthy line flagged by the model).

## Metrics

Each is a number from 0 to 1 (`null` when a scenario has nothing to measure).

- **Parsing accuracy**: the checked fields (level, service, time, format, lines) of the sample events.
- **Event coverage**: the relevant events that reached the analysis.
- **Incident precision / recall**: incidents found that match an expected one / expected incidents found.
- **Root cause accuracy**: expected root causes found with the right status and the right source event.
- **False positive rate**: incidents found that nothing expected explains.
- **Evidence validity**: the evidence in the report that matches the original log.
- **Processing time** and **AI cost**: the model call the context would cost (estimated; no call is made).

The earlier analysis (keyword filter, findings, root cause of the rules) is scored on the same
scenarios with the same definitions, for comparison.

## Results

Run on the 15 scenarios, 2026-11-08 (`server/benchmarks/results/latest.json`):

| Metric              | New engine | Earlier analysis |
| ------------------- | ---------- | ---------------- |
| Event coverage      | 1.00       | 0.90             |
| Incident precision  | 1.00       | 0.70             |
| Incident recall     | 1.00       | 0.89             |
| Root cause accuracy | 1.00       | 0.00             |
| False positive rate | 0.00       | 0.30             |
| Parsing accuracy    | 1.00       | not measured     |
| Evidence validity   | 1.00       | not measured     |

Read these with care. The fifteen logs are small and written to be unambiguous; a perfect score
here says the engine does what was designed, not that it will on any real log. During the work a
few expectations were corrected after a first run showed they asked for the wrong thing (a line
with level ERROR is an incident even when its date is invalid; two lines with no shared
identifier are not linked), and a few real defects were fixed (a service called `worker` read as a
thread, a cut JSON line glued to the line before it, warnings-only incidents rated too high).
Those are the kind of finding the benchmark exists for: add a scenario for every real log that
fooled the engine.

The earlier analysis' root cause accuracy is 0.00 because it only names a root cause when a log has
at least two distinct findings and a known chain between them.
