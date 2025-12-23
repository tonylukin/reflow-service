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