Ward
====

A library for effortlessly managing deeply-nested data structures in node and the browser.

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

var observer = ward.observe(data, function (path, value) {
  // When something changes in the data structure,
  // this gets called.
});

data.user.name(); // -> 'John'
data.user.friends(); // -> ['Mike', 'Alex']

data.user.name('Jack');
data.user.name(); // -> 'Jack'

data.user.friends[0]('Josh');
data.user.friends(); // -> ['Josh', 'Alex']

// Stop observing changes to data.
observer.dispose();

```

API
---

### `ward(value)`

Create a ward wrapper object around any `value`. _Ward_ will recursively wrap plain objects and arrays.

```js
var data = ward({a: 1});
```

### `ward.observe(object, observer)`

Observe ward `object` for changes, triggering `observer` function on any change to `object`’s value or nested values, passing in the path to the changed value as well as the new value.

```js
var students = ward({
  groupA: ['Alex', 'Chris', 'Jones'],
  groupB: ['Michael', 'Donna']
});

var observer1 = ward.observe(students, function (path, value) {
  path === ['groupA', 0];
  value === 'Rob';
});

var observer2 = ward.observe(students.groupA, function (path, value) {
  path === [0];
  value === 'Rob';
});

// This will trigger the above observers.
students.groupA[0] = 'Rob';

observer1.dispose();
observer2.dispose();
```

### `ward.keys(object)`

Given an `object` returned by `ward(value)`, return an array of all enumerable properties of `value`.

```js
var fruits = ward({red: 'apple', yellow: 'banana'});
ward.keys(fruits); // -> 'red', 'yellow'

var units = ward(['px', 'em', 'rem']);
ward.keys(units); // -> 0, 1, 2
```

### `ward.count(object)`

Return the count of an object’s enumerable properties.

```js
var fruits = ward({red: 'apple', yellow: 'banana'});
ward.count(fruits); // -> 2

var units = ward(['px', 'em', 'rem']);
ward.count(units); // -> 3

ward.count(units) === ward.keys(units).length // -> true
```

### `ward.assign(target, ...sources)`

Extend ward `target` with the enumerable properties of one or more objects or ward objects.

```js
var data = {a: 1, b: 2};

ward.assign(data, {c: 3}, ward({d: 4}));

data(); // -> {a: 1, b: 2, c: 3, d: 4}
```

Array Methods
-------------

When dealing with _ward_ objects that wrap around arrays, you can use array methods (like `forEach` and `push`) on them.

```js
var cars = ward(['Audi', 'BMW', 'Mercedes']);

cars.forEach(function (car) {
  // Do your thing!
});

cars.push('Ford');

cars(); // -> ['Audi', 'BMW', 'Mercedes']

```

IE8 Support
-----------

For _Ward_ to work on IE8, make sure to include [ES5 shim and sham](https://github.com/es-shims/es5-shim).
