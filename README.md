# Trace timer

[![npm](https://img.shields.io/npm/v/trace-timer.svg)](https://npm.im/trace-timer)
[![license](https://img.shields.io/npm/l/trace-timer.svg)](https://npm.im/trace-timer)
[![Build Status](https://travis-ci.org/jehy/trace-timer.svg?branch=master)](https://travis-ci.org/jehy/trace-timer)
[![Coverage Status](https://coveralls.io/repos/github/jehy/trace-timer/badge.svg?branch=master)](https://coveralls.io/github/jehy/trace-timer?branch=master)
[![dependencies Status](https://david-dm.org/jehy/trace-timer/status.svg)](https://david-dm.org/jehy/trace-timer)
[![devDependencies Status](https://david-dm.org/jehy/trace-timer/dev-status.svg)](https://david-dm.org/jehy/trace-timer?type=dev)
[![Known Vulnerabilities](https://snyk.io/test/github/jehy/trace-timer/badge.svg)](https://snyk.io/test/github/jehy/trace-timer)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/jehyrus)

Simple timer to trace your graph-like complex async code.

### Install

```bash
npm install  trace-timer
```

### Use
```js
    const TraceTimer = require('trace-timer')
    timer = new TraceTimer('someName', null, false);
    const timer1 = new TraceTimer('someChild1', null, false);
    timer1.countSync(()=>clock.tick(100));
    const timer2 = new TraceTimer('someChild2', null, false);
    timer2.countAsync(async()=>clock.tick(100));
    timer.addChild(timer1);
    timer.addChild(timer2);
    console.log(timer);

```
