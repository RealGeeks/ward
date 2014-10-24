'use strict';

var _ = require('lodash');
var isArray = _.isArray;
var isObject = _.isPlainObject;
var extend = _.extend;
var namespace = '__ward__';

function deleteProperties(object, keys) {
  keys.forEach(function (key) {
    delete object[key];
  });
}

var WrapperPrototype = {
  create: function (value, name) {
    var wrapper = Object.create(WrapperPrototype);

    wrapper.parent = this != WrapperPrototype ? this : undefined;
    wrapper.name = name;
    wrapper.value = value;
    wrapper.keys = [];
    wrapper.observers = [];

    var accessor = wrapper.accessor = function (newValue) {
      if (newValue !== undefined) {
        return wrapper.set(newValue);
      }
      return wrapper.value;
    };

    // Enables comparisons such as accessor == 2, when wrapper.value is 2.
    accessor.valueOf = accessor;

    // Enables use in string contexts, such as 'a' + accessor would be 'ab'
    // when wrapper.value is ['b'].
    accessor.toString = function () {
      return wrapper.value.toString();
    };

    accessor[namespace] = wrapper;

    if (isArray(value)) {
      extend(accessor, arrayExtension);
    }

    wrapper.walk();

    return accessor;
  },

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
      wrapper.parent.value[wrapper.name] = newValue;
    }

    wrapper.clean();
    wrapper.walk();
    wrapper.triggerObservers([], newValue);

    return true;
  },

  addObserver: function (observer) {
    var wrapper = this;

    wrapper.observers.push(observer);

    return {
      dispose: function () {
        _.pull(wrapper.observers, observer);
      }
    };
  },

  triggerObservers: function (path, newValue) {
    var wrapper = this;
    var parent = wrapper.parent;

    wrapper.observers.forEach(function (observer) {
      observer.call(wrapper.accessor, path, newValue);
    });

    parent && parent.triggerObservers(path.concat(wrapper.name), newValue);
  },

  clean: function () {
    var wrapper = this;
    wrapper.keys.forEach(function (key) {
      wrapper.accessor[key].parent = undefined;
      delete wrapper.accessor[key];
    });
    wrapper.keys.length = 0;
  },

  walk: function () {
    var wrapper = this;
    var data = wrapper.value;
    if (isArray(data) || isObject(data)) {
      _.each(data, function (value, key) {
        wrapper.accessor[key] = wrapper.create(value, key);
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
  return WrapperPrototype.create(value);
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
