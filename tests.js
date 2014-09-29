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

test('Ward.keys returns an object’s own enumerable properties', function (assert) {
  assert.plan(3);

  assert.deepEqual(ward.keys(ward([5, 3, 2])), [0, 1, 2], 'array keys');
  assert.deepEqual(ward.keys(ward({a: 1, b: 2})), ['a', 'b'], 'object keys');
  assert.deepEqual(ward.keys(ward(4)), [], 'number keys');
});

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
      ward({c: 3})
    )(),
    {a: 1, b: 2, c: 3},
    'complex'
  );

});
