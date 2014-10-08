'use strict';

var _ = require('lodash');
var isArray = _.isArray;
var isObject = _.isPlainObject;
var extend = _.extend;
var Emitter = require('eventemitter2').EventEmitter2;
var create = Object.create;
var namespace = '__ward__';

function deleteProperties(object, keys) {
  keys.forEach(function (key) {
    delete object[key];
  });
}

function Wrapper(value, path) {
  var wrapper = this;

  wrapper.keys = [];
  wrapper.path = path;
  wrapper.value = value;

  var accessor = wrapper.accessor = function (newValue) {
    if (newValue !== undefined) {
      return wrapper.set(newValue);
    }
    return wrapper.value;
  };

  // Enables comparisons such as accessor == 2, when wrapper.value is 2.
  accessor.valueOf = accessor;

  accessor[namespace] = wrapper;

  if (isArray(value)) {
    extend(accessor, arrayExtension);
  }

  wrapper.walk();

  return accessor;
}

var WrapperPrototype = {
  set: function (newValue) {
    var wrapper = this;
    // Bail if the new value is equivalent to the old.
    if (_.isEqual(wrapper.value, newValue)) {
      return false;
    }

    if (isArray(wrapper.value)) {
      if (!isArray(newValue)) {
        deleteProperties(wrapper.accessor, arrayMethods);
      }
    } else if (isArray(newValue)) {
      extend(wrapper.accessor, arrayExtension);
    }

    wrapper.value = newValue;

    if (wrapper.parent) {
      wrapper.parent.value[wrapper.path[wrapper.path.length - 1]] = newValue;
    }

    wrapper.clean();
    wrapper.walk();
    wrapper.emit(wrapper.path, newValue);

    return true;
  },

  addObserver: function (observer) {
    var wrapper = this;
    console.log(this);
    var path = wrapper.path.concat('**');
    var callback = function (newValue) {
      var path = this.event;
      observer.call(
        wrapper.accessor,
        _.difference(path, wrapper.path),
        newValue
      );
    };

    wrapper.on(path, callback);

    return {
      dispose: function () {
        wrapper.off(path, callback);
      }
    };
  },

  clean: function () {
    var wrapper = this;
    wrapper.keys.forEach(function (key) {
      delete wrapper.accessor[key];
    });
    wrapper.keys.length = 0;
  },

  walk: function () {
    var wrapper = this;
    var data = wrapper.value;
    if (isArray(data) || isObject(data)) {
      _.each(data, function (value, key) {
        wrapper.accessor[key] = wrapper.create(value, wrapper.path.concat(key));
        wrapper.keys.push(key);
      });
    }
  }
};

var arrayMutatorMethods =
  ['push', 'pop', 'shift', 'unshift', 'reverse', 'sort', 'splice'];
var arrayOtherMethods =
  [
    // Accessor methods
    'concat', 'join', 'slice', 'indexOf', 'lastIndexOf',

    // Iteration methods
    'forEach', 'every', 'some', 'filter', 'map', 'reduce', 'reduceRight'
  ];
var arrayMethods = arrayMutatorMethods.concat(arrayOtherMethods);
var arrayExtension = {};

arrayMutatorMethods.forEach(function (methodName) {
  arrayExtension[methodName] = function () {
    var accessor = this;
    var array = accessor().slice();
    var result = array[methodName].apply(array, arguments);
    accessor(array);
    return result;
  };
});

arrayOtherMethods.forEach(function (methodName) {
  arrayExtension[methodName] = function () {
    var array = this();
    return array[methodName].apply(array, arguments);
  };
});

var ward = module.exports = function (value) {
  var prototype = create(new Emitter({wildcard: true}));

  extend(prototype, WrapperPrototype);

  prototype.create = function (value, path) {
    var object = create(prototype);
    object.parent = this != prototype ? this : null;
    return Wrapper.call(object, value, path);
  };

  return prototype.create(value, []);
};

ward.observe = function (object, observer) {
  return object[namespace].addObserver(observer);
};

ward.keys = function (object) {
  return object[namespace].keys.slice();
};

ward.count = function (object) {
  return object[namespace].keys.length;
};

ward.assign = function (target, source) {
  if (!target[namespace]) {
    throw new TypeError('First argument needs to be a ward object.');
  }

  var targetValue = target();
  var i;
  var keys;
  var j;
  var key;

  if (!isObject(targetValue) && !isArray(targetValue)) {
    throw new TypeError('Can only assign to plain objects and arrays.');
  }

  targetValue = _.clone(targetValue);

  for (i = 1; i < arguments.length; i++) {
    source = arguments[i];

    if (source[namespace]) {
      source = source();
    }

    if (!isObject(source) && !isArray(source)) {
      continue;
    }

    keys = Object.keys(source);
    for (j = 0; j < keys.length; j++) {
      key = keys[j];
      targetValue[key] = source[key];
    }
  }

  target(targetValue);

  return target;
};
