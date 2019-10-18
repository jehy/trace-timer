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

function destroyChildren(timer) {
  timer.children.forEach((child)=>{
    child.addMetaMain = child.addMeta;
    destroyChildren(child);
  });
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
  */
  constructor(name, meta = null) {
    if (!name) {
      throw new Error('name must be provided for timer');
    }
    this.start = getMillis();
    this.meta = meta;
    this.name = name;
    this.children = [];
    this.blocking = false;
  }

  /**
   *
   * @param {TraceTimer} timer child timer to add
   * @param {boolean} [blocking] does it block execution
   * @returns {TraceTimer} timer child timer to add
   */
  addChild(timer, blocking = false) {
    this.children.push(timer);
    timer.blocking = blocking;
    timer.addMetaMain = (meta)=>this.addMetaMain(meta);
    return timer;
  }

  /**
   * Manually finish timer instead of wrapping a func, better not use it
   */
  finish() {
    if (this.end) {
      throw new Error('Timer already finished before finish!');
    }
    this.end = getMillis();
  }

  /**
   *
   * @param {function} func sync function to count time
   * @returns function return value
   */
  countSync(func) {
    if (this.end) {
      throw new Error('Timer already finished before countSync!');
    }
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
   * @param {function} func async function result to be awaited
   * @returns function return value
   */
  async countAsync(func) {
    if (this.end) {
      throw new Error('Timer already finished before countAsync!');
    }
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
   * @param {Promise} promise from async function result to be awaited
   * @returns function return value
   */
  async countPromise(promise) {
    if (this.end) {
      throw new Error('Timer already finished before countPromise!');
    }
    try {
      return await promise;
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
   * @param {Object} meta some data about main timer
   * @returns {Object} new meta
   */
  addMetaMain(meta) {
    this.addMeta(meta);
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
    if (!moreThanMin && childrenTable.length === 0) {
      return false;
    }
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

  /**
   * Avoid circular dependencies which can mess up Garbage Collector
   */
  destroy() {
    destroyChildren(this);
    this.addMeta = undefined;
    this.addMetaMain = undefined;
    this.children = undefined;
    this.meta = undefined;
  }
}

module.exports = TraceTimer;
