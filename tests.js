'use strict';

var test = require('tape');
var ward = require('./');

test('Read primitive value', function (assert) {
  var data = ward(2);
  assert.plan(1);
  assert.equal(data(), 2);
});

test('Read nested value', function (assert) {
  var data = ward({prop: 2, vector: [1, 2, 3]});
  assert.plan(4);
  assert.deepEqual(data(), {prop: 2, vector: [1, 2, 3]});
  assert.equal(data.prop(), 2);
  assert.deepEqual(data.vector(), [1, 2, 3]);
  assert.equal(data.vector[1](), 2);
});

test('Write primitive value', function (assert) {
  var data = ward('ant');
  assert.plan(2);

  assert.equal(data(), 'ant');
  data('bee');
  assert.equal(data(), 'bee');

});

test('Write nested primitive', function (assert) {
  var data = ward({nested: 'a'});
  assert.plan(3);

  assert.equal(data.nested(), 'a');
  data.nested('b');
  assert.equal(data.nested(), 'b');
  assert.deepEqual(data(), {nested: 'b'});
});

test('Write nested object', function (assert) {
  var data = ward({nested: {a: 1}});
  assert.plan(3);

  assert.deepEqual(data.nested(), {a: 1});
  data.nested({b: 2});
  assert.deepEqual(data.nested(), {b: 2});
  assert.deepEqual(data(), {nested: {b: 2}});
});

test('Write nested array', function (assert) {
  var data = ward({nested: {a: [1, 2, 3]}});
  assert.plan(2);

  data.nested.a[1]({b: 2});
  assert.equal(data.nested.a[1].b(), 2);
  assert.deepEqual(data(), {nested: {a: [1, {b: 2}, 3]}});
});

test('Removes old wrappers', function (assert) {
  var data = ward({nested: {a: 1, b: 2}});
  assert.plan(2);

  data.nested({b: 3});
  assert.equal(data.nested.b(), 3);
  assert.equal(data.nested.a, undefined, 'Removes old wrapper');
});

test('Does not update with equivalent value', function (assert) {
  var object = {a: {b: 0}};
  var data = ward(object);
  assert.plan(1);

  data.a({b: 0});
  assert.equal(data.a(), object.a);
});

test('Triggers observer', function (assert) {
  var data = ward(1);

  assert.plan(2);

  var observer = ward.observe(data, function (path, value) {
    assert.deepEqual(path, []);
    assert.equal(value, 2);
  });

  data(2);

  observer.dispose();

  // This should not trigger the observer since it was disposed off.
  data(3);
});

test('Triggers observer for nested change', function (assert) {
  var data = ward({a: 1});

  assert.plan(2);

  var observer = ward.observe(data, function (path, value) {
    assert.deepEqual(path, ['a']);
    assert.equal(value, 2);
  });

  data.a(2);

  observer.dispose();
});

test('Can observe nested data', function (assert) {
  var data = ward({a: {b: 1}});

  assert.plan(2);

  var observer = ward.observe(data.a, function (path, value) {
    assert.deepEqual(path, ['b']);
    assert.equal(value, 2);
  });

  data.a.b(2);

  observer.dispose();
});

test('Ward.keys returns an object’s own enumerable properties',
  function (assert) {
    assert.plan(3);

    assert.deepEqual(ward.keys(ward([5, 3, 2])), [0, 1, 2], 'array keys');
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

test('Ward.assign extends objects', function (assert) {
  assert.plan(6);

  var observable = ward({a: 2});

  var observer = ward.observe(observable, function (path, value) {
    assert.deepEqual(path, []);
    assert.deepEqual(value, {a: 2, b: 3});

    observer.dispose();
  });

  assert.throws(ward.assign.bind(ward, {}, {a: 1}), 'not a ward object');
  assert.throws(ward.assign.bind(ward, ward(3), {a: 1}), 'not object or array');
  assert.deepEqual(
    ward.assign(observable, ward({b: 3}))(),
    {a: 2, b: 3},
    'simple'
  );
  assert.deepEqual(
    ward.assign(
      ward({a: 1}),
      {b: 2},
      ward({c: 3}),
      [2, 3]
    )(),
    {0: 2, 1: 3, a: 1, b: 2, c: 3},
    'complex'
  );

});

test('Array Extension', function (assert) {
  var object1 = ward([1, 2]);
  var object2 = ward({a: 1});

  assert.plan(40);

  [
    'push', 'pop', 'shift', 'unshift', 'reverse', 'sort', 'splice',
    'concat', 'join', 'slice', 'indexOf', 'lastIndexOf',
    'forEach', 'every', 'some', 'filter', 'map', 'reduce', 'reduceRight'
  ]
    .forEach(function (methodName) {
      assert.ok(object1[methodName], methodName + ' exists');
      assert.ok(!object2[methodName], methodName + ' does not exist');
    });

  object1({b: 2});
  object2([2, 3]);

  assert.ok(!object1.push, 'remove array methods');
  assert.ok(object2.push, 'add array methods');
});

test('Array.push', function (assert) {
  assert.plan(3);

  var data = ward([1, 2]);
  var length = data.push(3, 4);

  assert.equal(length, 4, 'length');
  assert.deepEqual(data(), [1, 2, 3, 4], 'new array');

  // Only arrays should have push.
  assert.equal(ward({}).push, undefined);
});

test('Array.pop', function (assert) {
  assert.plan(2);

  var data = ward([1, 2]);
  var item = data.pop();

  assert.equal(item, 2, 'popped item');
  assert.deepEqual(data(), [1], 'new array');
});

test('Array.join', function (assert) {
  assert.plan(1);

  assert.equal(ward([1, 2]).join(), '1,2');
});
