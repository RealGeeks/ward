Ward
====

A library for effortlessly managing deeply-nested data in node and the browser.

Installation
------------

```bash
npm install ward
```

Usage
-----

```js
var ward = require('ward');
var data = ward({
  user: {
    name: 'John',
    friends: ['Mike', 'Alex']
  }
});

data.user.name(); // -> 'John'
data.user.friends(); // -> ['Mike', 'Alex']

data.user.name('Jack');
data.user.name(); // -> 'Jack'

data.user.friends[0]('Josh');
data.user.friends(); // -> ['Josh', 'Alex']
```

IE8 Support
===========

For _Ward_ to work on IE8, make sure to include [ES5 shim and sham](https://github.com/es-shims/es5-shim).
