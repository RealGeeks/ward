Ward
====

A library for effortlessly managing deeply-nested immutable data structures in node and the browser.

Installation
------------

```bash
npm install ward
```

Versions
--------

Master is still on the 0.4.x releases since the only internal project we have that uses this library still uses 0.4.x.
Also, we are publishing to @realgeeks/ward now since we don't have access to `ward` on npm.
New version is on the `new-version` branch.


Usage
-----

```js
var ward = require('ward');
var data = ward({
  user: {
    firstName: 'John',
    friends: ['Mike', 'Alex']
  }
});

var observer = ward.observe(data, function (newData) {
  // When something changes in the data structure,
  // this gets called with the new data structure.
  data = newData;
});

data.user.firstName(); // -> 'John'
data.user.friends(); // -> ['Mike', 'Alex']

data.user.firstName('Jack');
data.user.firstName(); // -> 'Jack'

data.user.friends[0]('Josh');
data.user.friends(); // -> ['Josh', 'Alex']

// Stop observing changes to data.
observer.dispose();

```

API
---

### `ward(value)`

Create a ward wrapper object around any `value`. _Ward_ will recursively wrap plain objects and arrays. **All ward object are immutable.**

```js
var data = ward({a: 1});
```

### `ward.observe(object, observer)`

Observe ward `object` for changes, triggering `observer` function on any change to `object`’s value or nested values, passing in the new value wrapped in a ward object.

```js
var students = ward({
  groupA: ['Alex', 'Chris', 'Jones'],
  groupB: ['Michael', 'Donna']
});

var observer1 = ward.observe(students, function (newStudents) {
  newStudents.groupA[0]() == 'Rob';
  students.groupA[0]() == 'Alex';
});

var observer2 = ward.observe(students.groupA, function (newGroupA) {
  newGroupA[0]() == 'Rob';
});

// This will trigger the above observers.
students.groupA[0]('Rob');

observer1.dispose();
observer2.dispose();
```

### `ward.keys(object)`

Given an `object` returned by `ward(value)`, return an array of all enumerable properties of `value`.

```js
var fruits = ward({red: 'apple', yellow: 'banana'});
ward.keys(fruits); // -> 'red', 'yellow'

var units = ward(['px', 'em', 'rem']);
ward.keys(units); // -> '0', '1', '2'
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

IE8 Support
-----------

For _Ward_ to work on IE8, make sure to include [ES5 shim and sham](https://github.com/es-shims/es5-shim).
