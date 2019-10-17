'use strict';

const {assert} = require('chai');
const nativeAssert = require('assert');

const sinon = require('sinon');
const {performance } = require('perf_hooks');
const TraceTimer = require('../index');

assert.rejects = nativeAssert.rejects;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

describe('TraceTimer: simple', ()=>{
  let clock;
  let timeStub;
  beforeEach(()=>{
    clock = sinon.useFakeTimers(100);
    timeStub = sinon.stub(performance, 'now').callsFake(()=>new Date().getTime());
  });
  afterEach(()=>{
    clock.restore();
    timeStub.restore();
  });
  it('should create timer without meta', ()=>{
    const timer = new TraceTimer('someName', null, true);
    const timerExpected = {
      start: 100,
      children: [],
      meta: null,
      name: 'someName',
      blocking: true,
    };
    assert.deepEqual(timer, timerExpected);
  });
  it('should create timer with meta', ()=>{
    const timer = new TraceTimer('someName', {a: 1}, true);
    const timerExpected = {
      start: 100,
      children: [],
      meta: {a: 1},
      name: 'someName',
      blocking: true,
    };
    assert.deepEqual(timer, timerExpected);
  });
  it('should log time for sync functions', ()=>{
    const timer = new TraceTimer('someName', null, false);
    const res = timer.countSync(()=>{ clock.tick(100); return 1; });
    const timerExpected = {
      start: 100,
      end: 200,
      children: [],
      meta: null,
      name: 'someName',
      blocking: false,
    };
    assert.deepEqual(timer, timerExpected);
    assert.equal(res, 1);
  });
  it('should log time for async functions', async ()=>{
    const timer = new TraceTimer('someName', null, false);
    const res = await timer.countAsync(async ()=>{ clock.tick(100); return 1; });
    const timerExpected = {
      start: 100,
      end: 200,
      children: [],
      meta: null,
      name: 'someName',
      blocking: false,
    };
    assert.deepEqual(timer, timerExpected);
    assert.equal(res, 1);
  });

  it('should catch errors in sync funcs', async ()=>{
    const timer = new TraceTimer('someName', null, false);
    assert.throws(()=>timer.countSync(()=>{ clock.tick(100); throw new Error('test'); }), Error, 'test');
    const timerExpected = {
      start: 100,
      end: 200,
      children: [],
      meta: null,
      name: 'someName',
      blocking: false,
      error: 'test',
    };
    assert.deepEqual(timer, timerExpected);
  });

  it('should catch errors in async funcs', async ()=>{
    const timer = new TraceTimer('someName', null, false);
    await assert.rejects(async ()=>timer.countAsync(()=>{ clock.tick(100); throw new Error('test'); }), Error, 'test');
    const timerExpected = {
      start: 100,
      end: 200,
      children: [],
      meta: null,
      name: 'someName',
      blocking: false,
      error: 'test',
    };
    assert.deepEqual(timer, timerExpected);
  });
});


describe('TraceTimer: complex', ()=>{
  let clock;
  let timeStub;
  let timer;
  before(()=>{
    clock = sinon.useFakeTimers(100);
    timeStub = sinon.stub(performance, 'now').callsFake(()=>new Date().getTime());
    timer = new TraceTimer('someName', null, false);
    const timer1 = new TraceTimer('someChild1', null, false);
    timer1.countSync(()=>clock.tick(100));
    const timer2 = new TraceTimer('someChild2', null, false);
    timer2.countSync(()=>clock.tick(100));
    // eslint-disable-next-line sonarjs/no-duplicate-string
    const timer3 = new TraceTimer('someChild1.1', {a: 1}, false);
    timer3.countSync(()=>clock.tick(100));
    // eslint-disable-next-line sonarjs/no-duplicate-string
    const timer4 = new TraceTimer('someChild1.2', null, true);
    timer4.countSync(()=>clock.tick(200));
    timer.addChild(timer1);
    timer.addChild(timer2);
    timer1.addChild(timer3);
    timer1.addChild(timer4);
  });
  after(()=>{
    clock.restore();
    timeStub.restore();
  });
  it('should be able to have children', ()=>{
    const timerExpected = {
      start: 100,
      blocking: false,
      meta: null,
      name: 'someName',
      children: [{
        start: 100,
        blocking: false,
        meta: null,
        name: 'someChild1',
        children: [{
          start: 300, blocking: false, meta: {a: 1}, name: 'someChild1.1', children: [], end: 400,
        }, {
          start: 400, blocking: true, meta: null, name: 'someChild1.2', children: [], end: 600,
        }],
        end: 200,
      }, {
        start: 200, blocking: false, meta: null, name: 'someChild2', children: [], end: 300,
      }],
    };
    assert.deepEqual(timer, timerExpected);
  });

  it('should be able to print data as a table', ()=>{
    const table = timer.toTable();
    assert.deepEqual(clone(table), [
      {
        start: 100,
        name: 'someName',
      },
      {
        start: 100,
        spent: 100,
        end: 200,
        name: 'someName:someChild1',
      },
      {
        start: 300,
        spent: 100,
        end: 400,
        name: 'someName:someChild1:someChild1.1',
        meta: '{"a":1}',
      },
      {
        start: 400,
        spent: 200,
        end: 600,
        name: 'someName:someChild1:someChild1.2',
        blocking: true,
      },
      {
        start: 200,
        spent: 100,
        end: 300,
        name: 'someName:someChild2',
      },
    ]);
  });

  it('should be able to print data as a table with min time value', ()=>{
    const table = timer.toTable(200);
    assert.deepEqual(clone(table), [
      {
        start: 100,
        name: 'someName',
      },
      {
        start: 100,
        spent: 100,
        end: 200,
        name: 'someName:someChild1',
      },
      {
        start: 400,
        spent: 200,
        end: 600,
        name: 'someName:someChild1:someChild1.2',
        blocking: true,
      },
    ]);
  });

  it('should be able to print data as a JSON', ()=>{
    const table = timer.toJson();
    assert.deepEqual(clone(table), {
      start: 100,
      name: 'someName',
      children: [{
        start: 100,
        end: 200,
        name: 'someChild1',
        spent: 100,
        children: [{
          start: 300,
          end: 400,
          name: 'someChild1.1',
          meta: {a: 1},
          spent: 100,
        }, {
          start: 400, end: 600, name: 'someChild1.2', blocking: true, spent: 200,
        }],
      }, {
        start: 200, end: 300, name: 'someChild2', spent: 100,
      }],
    });
  });


  it('should be able to print data as a JSON with min time value', ()=>{
    const table = timer.toJson(200);
    assert.deepEqual(clone(table), {
      start: 100,
      name: 'someName',
      children: [{
        start: 100,
        end: 200,
        name: 'someChild1',
        spent: 100,
        children: [{
          start: 400, end: 600, name: 'someChild1.2', blocking: true, spent: 200,
        }],
      }],
    });
  });
});
