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

test('Write undefined', function (assert) {
  assert.plan(1);
  assert.equal(ward(2)(undefined)(), undefined);
});

test('Write primitive value', function (assert) {
  var data = ward('ant');
  assert.plan(2);

  assert.equal(data(), 'ant');
  data = data('bee');
  assert.equal(data(), 'bee');

});

test('Write nested primitive', function (assert) {
  var data = ward({nested: 'a'});
  var nested = data.nested;
  assert.plan(3);

  assert.equal(nested(), 'a');

  nested = nested('b');

  assert.equal(nested(), 'b');
  assert.deepEqual(data(), {nested: 'a'});
});

test('Write nested object', function (assert) {
  var data = ward({nested: {a: 1}});
  var nested = data.nested;
  assert.plan(3);

  assert.deepEqual(nested(), {a: 1});

  nested = nested({b: 2});

  assert.deepEqual(nested(), {b: 2});
  assert.deepEqual(data(), {nested: {a: 1}});
});

test('Write nested array', function (assert) {
  var data = ward({nested: {a: [1, 2, 3]}});
  assert.plan(2);

  var nested = data.nested.a[1]({b: 2});
  assert.equal(nested.b(), 2);
  assert.deepEqual(data(), {nested: {a: [1, 2, 3]}});
});

test('Write deeply nested object', function (assert) {
  var data = ward({deeply: {nested: {a: 1}}});
  assert.plan(4);

  var nested = data.deeply.nested.a(2);

  assert.deepEqual(nested(), 2);
  assert.deepEqual(data.deeply.nested(), {a: 1});
  assert.deepEqual(data.deeply(), {nested: {a: 1}});
  assert.deepEqual(data(), {deeply: {nested: {a: 1}}});
});

test('Removes old wrappers', function (assert) {
  var data = ward({nested: {a: 1, b: 2}});
  assert.plan(2);

  var nested = data.nested({b: 3});
  assert.equal(nested.b(), 3);
  assert.equal(nested.a, undefined, 'Removes old wrapper');
});

test('Does not update with equivalent value', function (assert) {
  var object = {a: {b: 0}};
  var data = ward(object);
  assert.plan(2);

  var a = data.a({b: 0});
  assert.equal(a, data.a);
  assert.equal(a(), object.a);
});

test('Triggers observer', function (assert) {
  var data = ward(1);

  assert.plan(2);

  var observer = ward.observe(data, function (newData) {
    assert.equal(data(), 1);
    assert.equal(newData(), 2);
  });

  data(2);

  observer.dispose();

  // This should not trigger the observer since it was disposed off.
  data(3);
});

test('Triggers observer for nested change', function (assert) {
  var data = ward({a: 1});

  assert.plan(2);

  var observer = ward.observe(data, function (newData) {
    assert.equal(data.a(), 1, 'old data');
    assert.equal(newData.a(), 2, 'new data');
  });

  data.a(2);

  observer.dispose();
});

test('Can observe nested data', function (assert) {
  var data = ward({a: {b: 1}});

  assert.plan(2);

  var observer = ward.observe(data.a, function (newA) {
    assert.deepEqual(data.a(), {b: 1}, 'old a');
    assert.deepEqual(newA(), {b: 2}, 'new a');
  });

  data.a.b(2);

  observer.dispose();
});

test('Nested observers', function (assert) {
  assert.plan(3);

  var object = {a: {b: 1}};
  var data = ward(object);

  var observer1 = ward.observe(data, function (newData) {
    assert.deepEqual(newData(), {a: {b: 2}}, 'new Data');
  });

  var observer2 = ward.observe(data.a, function (newData) {
    assert.deepEqual(newData(), {b: 2}, 'new child Data');
  });

  assert.equal(data(), object, 'same initial data');

  data({a: {b: 2}});

  observer1.dispose();
  observer2.dispose();
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
