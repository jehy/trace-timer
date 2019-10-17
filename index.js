'use strict';

const {performance } = require('perf_hooks');


function getMillis() {
  return Math.round(performance.now());
}

function timerToJson(timer) {
  const spent = timer.end && timer.end - timer.start;
  return {
    start: timer.start,
    end: timer.end,
    name: timer.name,
    error: timer.error,
    meta: timer.meta || undefined,
    blocking: timer.blocking || undefined,
    spent,
  };
}

function timerToRow(prefix, timer) {
  const spent = timer.end && timer.end - timer.start;
  return {
    start: timer.start,
    end: timer.end,
    name: `${prefix}${timer.name}`,
    error: timer.error,
    spent,
    meta: timer.meta && JSON.stringify(timer.meta) || undefined,
    blocking: timer.blocking || undefined,
  };
}

class TraceTimer {
  /**
  *
  * @param {String} name timer name
  * @param {Object} [meta] some data about this timer
  * @param {boolean} [blocking] does it block execution
  */
  constructor(name, meta = null, blocking = false) {
    if (!name) {
      throw new Error('name should be provided for timer!');
    }
    this.start = getMillis();
    this.blocking = blocking;
    this.meta = meta;
    this.name = name;
    this.children = [];
  }

  /**
   *
   * @param {TraceTimer} timer child timer to add
   */
  addChild(timer) {
    this.children.push(timer);
  }

  /**
   * Manually finish timer instead of wrapping a func, better not use it
   */
  finish() {
    this.end = getMillis();
  }

  /**
   *
   * @param {function} func sync function to count time
   * @returns function return value
   */
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

  /**
   *
   * @param {function} func async sync function to count time
   * @returns function return value
   */
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
   * @returns {Object} new meta
  */
  addMeta(meta) {
    if (!this.meta) {
      this.meta = meta;
      return meta;
    }
    return Object.assign(this.meta, meta);
  }

  /**
   *
   * @returns {Object} timer meta
   */
  getMeta() {
    return this.meta;
  }

  /**
   *
   * @param {number} [min] minimal timer value to filter out
   * @param {string} [prefix] prefix for sub-timer
   * @returns {Object} array representation of timer data
   */
  toTable(min = 0, prefix) {
    const currentPrefix = prefix && `${prefix}:` || '';
    const thisRow = [timerToRow(currentPrefix, this)];
    const moreThanMin = (min === 0) || !this.end || ((this.end - this.start) >= min);
    if (!this.children.length) {
      if (!moreThanMin) {
        return false;
      }
      return thisRow;
    }
    const childrenTable = this.children
      .reduce((res, childTimer)=>{
        return res.concat(childTimer.toTable(min, `${currentPrefix}${this.name}`));
      }, [])
      .filter((el)=>el);
    return thisRow.concat(childrenTable);
  }

  /**
   *
   * @param {number} [min] minimal timer value to filter out
   * @returns {Object} Object representation of timer data
   */
  toJson(min = 0) {
    const thisTimer = timerToJson(this);
    const moreThanMin = (min === 0) || !this.end || ((this.end - this.start) >= min);
    if (!this.children.length) {
      if (!moreThanMin) {
        return false;
      }
      return thisTimer;
    }
    const childTimers = this.children
      .map((child) => child.toJson(min))
      .filter((el) => el);
    if (!moreThanMin && childTimers.length === 0) {
      return false;
    }
    return {...thisTimer, children: childTimers};
  }
}

module.exports = TraceTimer;
