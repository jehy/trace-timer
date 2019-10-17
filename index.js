'use strict';

const {performance } = require('perf_hooks');


function getMillis() {
  return Math.round(performance.now());
}

class TraceTimer {
  /**
  *
  * @param {String} name timer name
  * @param {Object} [meta] some data about this timer
  * @param {boolean} [blocking] does it block execution
  */
  constructor(name, meta = {}, blocking = false) {
    if (!name) {
      throw new Error('name should be provided for timer!');
    }
    this.start = getMillis();
    this.blocking = blocking;
    this.meta = meta || {};
    this.name = name;
    this.children = [];
  }

  addChild(timer) {
    this.children.push(timer);
  }

  // finish() {
  //  this.end = getMillis();
  // }

  countSync(func) {
    try {
      return func();
    } catch (err) {
      this.error = err.message;
      throw err;
    } finally {
      this.end = getMillis();
    }
  }

  async countAsync(func) {
    try {
      return await func();
    } catch (err) {
      this.error = err.message;
      throw err;
    } finally {
      this.end = getMillis();
    }
  }

  /**
  *
  * @param {Object} meta some data about this timer
  */
  addMeta(meta) {
    return Object.assign(this.meta, meta);
  }

  getMeta() {
    return this.meta;
  }

  toTable(prefix) {
    const currentPrefix = prefix && `${prefix}:` || '';
    const spent = this.end && this.end - this.start;
    const thisRow = [{
      start: this.start,
      end: this.end,
      name: `${currentPrefix}${this.name}`,
      error: this.error,
      spent,
    }];
    if (!this.children.length) {
      return thisRow;
    }
    const childrenTable = (this.children || []).reduce((res, childTimer)=>{
      return res.concat(childTimer.toTable(`${currentPrefix}${this.name}`));
    }, []);
    return thisRow.concat(childrenTable);
  }
}

module.exports = TraceTimer;
