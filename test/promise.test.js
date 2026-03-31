import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MyPromise } from '../src/index.js';

describe('Basic resolution', () => {
  it('should resolve with a value', async () => {
    const p = new MyPromise(resolve => resolve(42));
    const val = await p.then(v => v);
    assert.equal(val, 42);
  });

  it('should reject with a reason', async () => {
    const p = new MyPromise((_, reject) => reject('error'));
    const reason = await p.catch(r => r);
    assert.equal(reason, 'error');
  });

  it('should handle async resolve', async () => {
    const p = new MyPromise(resolve => setTimeout(() => resolve('async'), 10));
    const val = await p.then(v => v);
    assert.equal(val, 'async');
  });

  it('should handle executor throwing', async () => {
    const p = new MyPromise(() => { throw new Error('oops'); });
    const reason = await p.catch(r => r.message);
    assert.equal(reason, 'oops');
  });

  it('should ignore multiple resolves', async () => {
    const p = new MyPromise(resolve => {
      resolve(1);
      resolve(2); // Should be ignored
    });
    const val = await p.then(v => v);
    assert.equal(val, 1);
  });
});

describe('then chaining', () => {
  it('should chain then calls', async () => {
    const result = await new MyPromise(resolve => resolve(1))
      .then(v => v + 1)
      .then(v => v * 2)
      .then(v => v);
    assert.equal(result, 4);
  });

  it('should pass through value when handler is not a function', async () => {
    const result = await new MyPromise(resolve => resolve(42))
      .then(null)
      .then(v => v);
    assert.equal(result, 42);
  });

  it('should catch errors in then chain', async () => {
    const result = await new MyPromise(resolve => resolve(1))
      .then(() => { throw new Error('chain error'); })
      .catch(e => e.message);
    assert.equal(result, 'chain error');
  });

  it('should handle returning a promise from then', async () => {
    const result = await new MyPromise(resolve => resolve(1))
      .then(v => new MyPromise(resolve => resolve(v + 10)))
      .then(v => v);
    assert.equal(result, 11);
  });
});

describe('catch', () => {
  it('should catch rejections', async () => {
    const reason = await MyPromise.reject('fail').catch(r => r);
    assert.equal(reason, 'fail');
  });

  it('should continue chain after catch', async () => {
    const result = await MyPromise.reject('fail')
      .catch(r => r + ' recovered')
      .then(v => v);
    assert.equal(result, 'fail recovered');
  });
});

describe('finally', () => {
  it('should run on resolve', async () => {
    let ran = false;
    const val = await MyPromise.resolve(42)
      .finally(() => { ran = true; })
      .then(v => v);
    assert.equal(ran, true);
    assert.equal(val, 42);
  });

  it('should run on reject', async () => {
    let ran = false;
    const reason = await MyPromise.reject('err')
      .finally(() => { ran = true; })
      .catch(r => r);
    assert.equal(ran, true);
    assert.equal(reason, 'err');
  });

  it('should pass through the original value', async () => {
    const val = await MyPromise.resolve('hello')
      .finally(() => 'ignored')
      .then(v => v);
    assert.equal(val, 'hello');
  });
});

describe('Promise.all', () => {
  it('should resolve when all resolve', async () => {
    const result = await MyPromise.all([
      MyPromise.resolve(1),
      MyPromise.resolve(2),
      MyPromise.resolve(3),
    ]).then(v => v);
    assert.deepEqual(result, [1, 2, 3]);
  });

  it('should reject on first rejection', async () => {
    const reason = await MyPromise.all([
      MyPromise.resolve(1),
      MyPromise.reject('fail'),
      MyPromise.resolve(3),
    ]).catch(r => r);
    assert.equal(reason, 'fail');
  });

  it('should handle empty array', async () => {
    const result = await MyPromise.all([]).then(v => v);
    assert.deepEqual(result, []);
  });

  it('should handle non-promise values', async () => {
    const result = await MyPromise.all([1, 2, 3]).then(v => v);
    assert.deepEqual(result, [1, 2, 3]);
  });
});

describe('Promise.race', () => {
  it('should resolve with first resolved', async () => {
    const result = await MyPromise.race([
      new MyPromise(resolve => setTimeout(() => resolve('slow'), 50)),
      new MyPromise(resolve => setTimeout(() => resolve('fast'), 10)),
    ]).then(v => v);
    assert.equal(result, 'fast');
  });

  it('should reject with first rejected', async () => {
    const reason = await MyPromise.race([
      new MyPromise((_, reject) => setTimeout(() => reject('err'), 10)),
      new MyPromise(resolve => setTimeout(() => resolve('ok'), 50)),
    ]).catch(r => r);
    assert.equal(reason, 'err');
  });
});

describe('Promise.allSettled', () => {
  it('should report all results', async () => {
    const results = await MyPromise.allSettled([
      MyPromise.resolve(1),
      MyPromise.reject('err'),
      MyPromise.resolve(3),
    ]).then(v => v);
    assert.equal(results.length, 3);
    assert.deepEqual(results[0], { status: 'fulfilled', value: 1 });
    assert.deepEqual(results[1], { status: 'rejected', reason: 'err' });
    assert.deepEqual(results[2], { status: 'fulfilled', value: 3 });
  });
});

describe('Promise.any', () => {
  it('should resolve with first fulfilled', async () => {
    const result = await MyPromise.any([
      MyPromise.reject('err1'),
      MyPromise.resolve('ok'),
      MyPromise.reject('err2'),
    ]).then(v => v);
    assert.equal(result, 'ok');
  });

  it('should reject when all reject', async () => {
    const err = await MyPromise.any([
      MyPromise.reject('a'),
      MyPromise.reject('b'),
    ]).catch(e => e);
    assert.ok(err instanceof AggregateError);
  });
});

describe('Thenable handling', () => {
  it('should resolve with native Promise value', async () => {
    const val = await new MyPromise(resolve => resolve(Promise.resolve(99))).then(v => v);
    assert.equal(val, 99);
  });
});
