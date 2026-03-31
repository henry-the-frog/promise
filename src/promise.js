// promise.js — Promises/A+ compliant implementation from scratch
//
// A Promise represents the eventual result of an async operation.
// It can be in one of three states: pending, fulfilled, or rejected.
// Once settled (fulfilled or rejected), it cannot change state.

const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

export class MyPromise {
  constructor(executor) {
    this._state = PENDING;
    this._value = undefined;
    this._reason = undefined;
    this._onFulfilled = [];
    this._onRejected = [];

    const resolve = value => {
      if (this._state !== PENDING) return;
      // Handle thenable
      if (value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function') {
        value.then(resolve, reject);
        return;
      }
      this._state = FULFILLED;
      this._value = value;
      this._onFulfilled.forEach(fn => queueMicrotask(() => fn(this._value)));
    };

    const reject = reason => {
      if (this._state !== PENDING) return;
      this._state = REJECTED;
      this._reason = reason;
      this._onRejected.forEach(fn => queueMicrotask(() => fn(this._reason)));
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handleFulfilled = value => {
        try {
          if (typeof onFulfilled === 'function') {
            resolve(onFulfilled(value));
          } else {
            resolve(value);
          }
        } catch (err) {
          reject(err);
        }
      };

      const handleRejected = reason => {
        try {
          if (typeof onRejected === 'function') {
            resolve(onRejected(reason));
          } else {
            reject(reason);
          }
        } catch (err) {
          reject(err);
        }
      };

      if (this._state === FULFILLED) {
        queueMicrotask(() => handleFulfilled(this._value));
      } else if (this._state === REJECTED) {
        queueMicrotask(() => handleRejected(this._reason));
      } else {
        this._onFulfilled.push(handleFulfilled);
        this._onRejected.push(handleRejected);
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    return this.then(
      value => MyPromise.resolve(onFinally()).then(() => value),
      reason => MyPromise.resolve(onFinally()).then(() => { throw reason; })
    );
  }

  // === Static methods ===

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(resolve => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = [];
      let pending = promises.length;

      if (pending === 0) { resolve([]); return; }

      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(
          value => {
            results[i] = value;
            if (--pending === 0) resolve(results);
          },
          reject // First rejection rejects the whole thing
        );
      });
    });
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      for (const p of promises) {
        MyPromise.resolve(p).then(resolve, reject);
      }
    });
  }

  static allSettled(promises) {
    return new MyPromise(resolve => {
      const results = [];
      let pending = promises.length;

      if (pending === 0) { resolve([]); return; }

      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(
          value => {
            results[i] = { status: 'fulfilled', value };
            if (--pending === 0) resolve(results);
          },
          reason => {
            results[i] = { status: 'rejected', reason };
            if (--pending === 0) resolve(results);
          }
        );
      });
    });
  }

  static any(promises) {
    return new MyPromise((resolve, reject) => {
      const errors = [];
      let pending = promises.length;

      if (pending === 0) { reject(new AggregateError([], 'All promises were rejected')); return; }

      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(
          resolve, // First fulfillment resolves
          reason => {
            errors[i] = reason;
            if (--pending === 0) reject(new AggregateError(errors, 'All promises were rejected'));
          }
        );
      });
    });
  }
}
