## Setup application
### Install dependencies
```bash
npm install
```
### Run application on localhost:3009. I hope this port is free on your machine. Otherwise, change it in `src/main.ts` (ENVs are not used here).
```bash
npm run start
```
There are 2 ways to test the application:
- Run tests with `npm test`
- Use browser or Postman to send requests to the endpoints:
  - GET `http://localhost:3009/reflow` - This complex case demonstrates reflow using tight shifts, dependency on two other tasks, and a maintenance window cases: own maintenance window and occasional maintenance windows from other work order.
  - GET `http://localhost:3009/reflow2` - Another case demonstrating reflow with two orders competing for the same work center, in the same time and same maintenance window.

## Documentation
- [Algorithm Design](./prompts/algorithm-design.md)
- [DAG Implementation](./src/reflow/dag.service.ts) and [Test](./src/reflow/dag.service.spec.ts) for future integration (@upgrade)

High‑level overview of `src/reflow/reflow.service.ts`:

- NestJS `Injectable` service that computes a constrained schedule for work orders.
- Uses Luxon `DateTime` and helper date utils (`D`) for shifts, maintenance, and time math.
- `DATE_FORMAT` defines the output format for all timestamps.

What `reflow(...)` does:

1. Validates dependency graph and topologically orders work orders (via `ConstraintChecker`), also accounting for maintenance.
2. Prepares maps:
   - Work center lookup by `docId`.
   - Latest completion time per work order.
   - Next available time per work center.
3. For each work order:
   - Starts from its original `startDate`.
   - Moves the cursor forward to:
     - After all dependency completions.
     - After the work center becomes free.
   - Splits execution into time segments while respecting:
     - Shift hours (pauses outside shifts; jumps to next shift start).
     - Maintenance windows (pauses during maintenance; jumps to maintenance end).
     - Break boundaries (ends a segment at the earliest of shift end or next maintenance start).
   - Records each segment and advances until all `durationMinutes` are scheduled.
   - Updates completion and work‑center availability at the final cursor.
   - Appends a schedule entry and, if the end time changed, a change record with reasons and `deltaMinutes`.
4. Returns `{ schedule, changes }`.

Notable details:

- `manufacturingOrders` parameter is currently unused (marked for future work).
- `reasons` collects human‑readable causes for pauses (outside shift, maintenance).
- Potential type issue: `segments` is typed as `{ start: DateTime, end: DateTime }[]` but stores formatted strings; either adjust the type or store `DateTime` and format on output.
- `deltaMinutes` may be fractional; consider rounding if integers are required.