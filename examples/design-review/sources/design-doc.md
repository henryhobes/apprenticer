# Moving background jobs off the primary database

Sam Reyes, Platform. Draft for review with Dana Okafor (VP Engineering), Thursday 12 November. Fictional example.

## Summary
Our background jobs live in a `jobs` table on the primary Postgres. About 40 workers poll it with `SELECT ... FOR UPDATE SKIP LOCKED`. At month-end the billing run floods that table and the polling competes with web traffic for the primary. I propose moving jobs to Amazon SQS (standard queues, one per job family, each with a dead-letter queue), one family at a time over 10 weeks, and dropping the `jobs` table by 31 March.

## The problem
- Volume: about 4M jobs a day; 11M on the 1st of the month (the billing run).
- 1 November billing run: the backlog peaked at 3 h 10 min. Invoice emails went out up to three hours late. Web p99 went from 400 ms to 2.8 s for two hours, because polling and vacuuming the churning `jobs` table load the primary.
- 14 September incident: a worker deploy killed jobs mid-run. They were retried after the 5-minute lock timeout and 1,140 customers got their invoice email twice. `send_invoice_email` is not idempotent.
- The primary runs at 70% CPU at the month-end peak. The next instance size costs $4,100 a month more and buys about a year.

## Options
**A. A separate Postgres instance for jobs.** About 2 weeks. About $900 a month. Takes job load off the primary. Keeps polling, table bloat (on its own box) and our homegrown retry code.

**B. A managed queue, Amazon SQS (recommended).** About 10 weeks: one engineer full time, part of a second. About $160 a month in requests (130M jobs a month, three requests each: send, receive, delete). No polling of the primary; retries and dead-letter queues built in; the visibility timeout replaces our lock timeout. New to us: delivery is at-least-once, so a job can arrive twice even without a crash.

**C. Do nothing and size up the primary.** $4,100 a month, no engineering, about a year of headroom. Fixes neither the duplicates nor the polling.

## Plan (option B)
1. Weeks 1-2: idempotency keys for the three jobs with side effects (`send_invoice_email`, `charge_card`, `sync_ledger`): a `job_effects` table keyed by job ID, checked before acting.
2. Weeks 3-4: move one low-risk family (search reindexing, 40% of volume) behind a per-family flag. Compare counts daily.
3. Weeks 5-8: move the other families one at a time, never in the last three or first three days of a month. Billing last.
4. Weeks 9-10: move delayed jobs, then drain and drop the `jobs` table by 31 March.

Rollback: each family's flag sends it back to Postgres in under a minute. The `jobs` table stays until step 4.

## Success
- Month-end web p99 under 500 ms.
- Month-end billing backlog under 15 minutes.
- No duplicate side effects (conflicts on `job_effects` are logged and counted).
- `jobs` table dropped by 31 March.

## Owner
The Platform team; on-call is the existing Platform rota.

## Open questions
- Delayed jobs: about 3% of volume (payment reminders, scheduled days ahead). SQS can delay a message by at most 15 minutes, so these need another home, probably EventBridge Scheduler. Not yet costed.
- `sync_ledger` needs per-account ordering. A standard queue plus a sequence check, or a FIFO queue? Not decided.
