'use strict';

var test = require('tape');
var ward = require('./');

test('Read primitive value', function (assert) {
  var data = ward(2);
  assert.plan(1);
  assert.equal(data.get(), 2);
});

test('Read nested value', function (assert) {
  var data = ward({prop: 2, vector: [1, 2, 3]});
  assert.plan(4);
  assert.deepEqual(data.get(), {prop: 2, vector: [1, 2, 3]});
  assert.equal(data.prop.get(), 2);
  assert.deepEqual(data.vector.get(), [1, 2, 3]);
  assert.equal(data.vector[1].get(), 2);
});

test('Does not mutate when value mutates', function (assert) {
  assert.plan(2);

  var value = [1, 2, 3];
  var data = ward(value);

  value.push(4);

  assert.deepEqual(data.get(), [1, 2, 3], 'one level');

  value = {a: {b: 1}};
  data = ward(value);

  value.a.b = 2;

  assert.deepEqual(data.get(), {a: {b: 1}}, 'two levels');
});

test('Correctly stores arrays with holes', function (assert) {
  var array = [];
  array.length = 9;
  array[2] = 1;
  array[7] = 2;

  var data = ward(array);
  assert.plan(3);

  assert.equal(data.get().length, 9);
  assert.equal(data.get()[2], 1);
  assert.equal(data.get()[7], 2);
});

test('Write undefined', function (assert) {
  assert.plan(1);
  assert.equal(ward(2).set(undefined).get(), undefined);
});

test('Writing equivalent value returns same object', function (assert) {
  assert.plan(2);

  var data = ward('foo');
  assert.equal(data.set('foo'), data);

  data = ward({a: 'foo'});
  assert.equal(data.set({a: 'foo'}), data);
});

test('Write primitive value', function (assert) {
  var data = ward('ant');
  assert.plan(2);

  assert.equal(data.get(), 'ant');
  data = data.set('bee');
  assert.equal(data.get(), 'bee');

});

test('Write nested primitive', function (assert) {
  var data = ward({nested: 'a'});
  var nested = data.nested;
  assert.plan(3);

  assert.equal(nested.get(), 'a');

  nested = nested.set('b');

  assert.equal(nested.get(), 'b');
  assert.deepEqual(data.get(), {nested: 'a'});
});

test('Write nested object', function (assert) {
  var data = ward({nested: {a: 1}});
  var nested = data.nested;
  assert.plan(3);

  assert.deepEqual(nested.get(), {a: 1});

  nested = nested.set({b: 2});

  assert.deepEqual(nested.get(), {b: 2});
  assert.deepEqual(data.get(), {nested: {a: 1}});
});

test('Write nested array', function (assert) {
  var data = ward({nested: {a: [1, 2, 3]}});
  assert.plan(2);

  var nested = data.nested.a[1].set({b: 2});
  assert.equal(nested.b.get(), 2);
  assert.deepEqual(data.get(), {nested: {a: [1, 2, 3]}});
});

test('Write deeply nested object', function (assert) {
  var data = ward({deeply: {nested: {a: 1}}});
  assert.plan(4);

  var nested = data.deeply.nested.a.set(2);

  assert.deepEqual(nested.get(), 2);
  assert.deepEqual(data.deeply.nested.get(), {a: 1});
  assert.deepEqual(data.deeply.get(), {nested: {a: 1}});
  assert.deepEqual(data.get(), {deeply: {nested: {a: 1}}});
});

test('Removes old wrappers', function (assert) {
  var data = ward({nested: {a: 1, b: 2}});
  assert.plan(2);

  var nested = data.nested.set({b: 3});
  assert.equal(nested.b.get(), 3);
  assert.equal(nested.a, undefined, 'Removes old wrapper');
});

test('Does not update with equivalent value', function (assert) {
  var object = {a: {b: 0}};
  var data = ward(object);
  assert.plan(2);

  var a = data.a.set({b: 0});
  assert.equal(a, data.a);
  assert.deepEqual(a.get(), object.a);
});

test('Triggers observer', function (assert) {
  var data = ward(1);

  assert.plan(2);

  var observer = ward.observe(data, function (newData) {
    assert.equal(data.get(), 1);
    assert.equal(newData.get(), 2);
  });

  data.set(2);

  observer.dispose();

  // This should not trigger the observer since it was disposed off.
  data.set(3);
});

test('Triggers observer on consecutive updates', function (assert) {
  assert.plan(2);

  var data = ward({foo: 'a'});
  var count = 0;

  var observer = ward.observe(data, function (newData) {
    data = newData;

    if (count == 0) {
      assert.deepEqual(newData.get(), {foo: 'b'});
    } else {
      assert.deepEqual(newData.get(), {bar: 'c'});
    }

    count++;
  });

  data.foo.set('b');
  data.set({bar: 'c'});

  observer.dispose();
});

test('Triggers observer only once', function (assert) {
  assert.plan(1);

  var data = ward({foo: {bar: {baz: 1, qux: 2}}});
  var observer = ward.observe(data, function (newData) {
    assert.deepEqual(newData.get(), {foo: {bar: {baz: 3, qux: 4}}});
  });

  data.foo.bar.set({baz: 3, qux: 4});

  observer.dispose();
});

test('Does not trigger observer for same child value', function (assert) {
  assert.plan(1);

  var data = ward({foo: 'bar'});
  var observer = ward.observe(data, function () {
    assert.fail('Should not have been called!');
  });

  data.foo.set('bar');

  observer.dispose();

  assert.ok('Done');
});

test('Triggers observer for nested change', function (assert) {
  var data = ward({a: 1});

  assert.plan(2);

  var observer = ward.observe(data, function (newData) {
    assert.equal(data.a.get(), 1, 'old data');
    assert.equal(newData.a.get(), 2, 'new data');
  });

  data.a.set(2);

  observer.dispose();
});

test('Can observe nested data', function (assert) {
  var data = ward({a: {b: 1}});

  assert.plan(2);

  var observer = ward.observe(data.a, function (newA) {
    assert.deepEqual(data.a.get(), {b: 1}, 'old a');
    assert.deepEqual(newA.get(), {b: 2}, 'new a');
  });

  data.a.b.set(2);

  observer.dispose();
});

test('Nested observers', function (assert) {
  assert.plan(3);

  var object = {a: {b: 1}};
  var data = ward(object);

  var observer1 = ward.observe(data, function (newData) {
    assert.deepEqual(newData.get(), {a: {b: 2}}, 'new Data');
  });

  var observer2 = ward.observe(data.a, function (newData) {
    assert.deepEqual(newData.get(), {b: 2}, 'new child Data');
  });

  assert.deepEqual(data.get(), {a: {b: 1}}, 'same initial data');

  data.set({a: {b: 2}});

  observer1.dispose();
  observer2.dispose();
});

test('Change ward object from observer', function (assert) {
  assert.plan(4);

  var data = ward({a: {b: 1}});
  var count = 0;

  var o1 = ward.observe(data, function (newData) {
    assert.equal(newData.a.b.get(), 3, 'Third call');
    assert.equal(count, 2, 'Call count');
  });

  var o2 = ward.observe(data.a, function (newA) {
    if (!count) {
      assert.equal(newA.b.get(), 2, 'First call');
    } else {
      assert.equal(newA.b.get(), 3, 'Second call');
    }

    count++;
    newA.b.set(3);
  });

  data.a.b.set(2);

  o1.dispose();
  o2.dispose();
});

test('README example', function (assert) {
  assert.plan(4);

  var data = ward({
    user: {
      firstName: 'John',
      friends: ['Mike', 'Alex']
    }
  });

  var observer = ward.observe(data, function (newData) {
    data = newData;
  });

  assert.equal(data.user.firstName.get(), 'John');
  assert.deepEqual(data.user.friends.get(), ['Mike', 'Alex']);

  data.user.firstName.set('Jack');
  assert.equal(data.user.firstName.get(), 'Jack');

  data.user.friends[0].set('Josh');
  assert.deepEqual(data.user.friends.get(), ['Josh', 'Alex']);

  // Stop observing changes to data.
  observer.dispose();
});

test('Ward.keys returns an object’s own enumerable properties',
  function (assert) {
    assert.plan(3);

    assert.deepEqual(ward.keys(ward([5, 3, 2])), ['0', '1', '2'], 'array keys');
    assert.deepEqual(ward.keys(ward({a: 1, b: 2})), ['a', 'b'], 'object keys');
    assert.deepEqual(ward.keys(ward(4)), [], 'number keys');
  }
);

test('Ward.count returns an object’s own enumerable properties count',
  function (assert) {
    assert.plan(3);

    assert.equal(ward.count(ward('asd')), 0, 'primitive length');
    assert.equal(ward.count(ward([5, 3, 2])), 3, 'array length');
    assert.equal(ward.count(ward({a: 1, b: 2})), 2, 'object props count');
  }
);

test('Ward objects used in primitive contexts', function (assert) {
  assert.plan(3);

  var data = ward({
    a: 4,
    b: 'something'
  });

  assert.ok(data.a == 4, 'equality');
  assert.equal(data.a + 2, 6, 'sum');
  assert.equal(data.b + ' else', 'something else', 'concatenation');
});

test('Ward objects used in string contexts', function (assert) {
  assert.plan(1);

  var data = ward([5]);

  assert.equal(data + '5', '55', 'concatenation');
});

test('Ward objects used in JSON.stringify()', function (assert) {
  assert.plan(1);

  assert.deepEqual(JSON.stringify(ward(9)), '9');
});

test('Ward.assign', function (assert) {
  assert.plan(9);

  var data = ward({a: 1});

  assert.throws(ward.assign.bind(undefined, 3, {a: 2}), 'throws for number');
  assert.throws(
    ward.assign.bind(undefined, function () {}),
    'throws for function'
  );

  assert.equal(ward.assign(data), data, 'no source');
  assert.equal(ward.assign(data, 5), data, 'ignore non objects or arrays');
  assert.equal(ward.assign(data, undefined), data, 'ignore undefined');
  assert.equal(ward.assign(data, null), data, 'ignore null');

  assert.deepEqual(
    ward.assign(data, {a: 2, b: 3}, {b: 4}).get(),
    {a: 2, b: 4},
    'extend object'
  );

  assert.deepEqual(
    ward.assign(ward([1, 2, 3]), [5]).get(),
    [5, 2, 3],
    'extend array'
  );

  assert.deepEqual(
    ward.assign(data, ward({foo: 'bar'})).get(),
    {a: 1, foo: 'bar'},
    'extend with ward object'
  );
});
