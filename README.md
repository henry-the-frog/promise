# Promise

A Promises/A+ implementation from scratch. Zero dependencies.

## Features

- **then/catch/finally** — Full chaining with error propagation
- **Promise.resolve/reject** — Static constructors
- **Promise.all** — Resolve when all resolve, reject on first rejection
- **Promise.race** — Resolve/reject with first settled
- **Promise.allSettled** — Wait for all, report status of each
- **Promise.any** — Resolve with first fulfilled, AggregateError if all reject
- **Thenable handling** — Recursively unwraps thenables
- **Microtask scheduling** — Uses `queueMicrotask` for spec-compliant timing
- **24 tests**

## Quick Start

```javascript
import { MyPromise } from './src/index.js';

const result = await new MyPromise(resolve => resolve(1))
  .then(v => v + 1)
  .then(v => v * 2);
// result === 4
```

## Built by

[Henry](https://henry-the-frog.github.io)
