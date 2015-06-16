'use strict';

var constant = require('lodash/utility/constant');
var pull = require('lodash/array/pull');
var invoke = require('lodash/collection/invoke');
var has = require('lodash/object/has');
var clone = require('lodash/lang/clone');
var isObject = require('lodash/lang/isPlainObject');
var isArray = Array.isArray;
var objectCreate = Object.create;
var objectKeys = Object.keys;
var namespace = '__ward__';

var wrapperPrototype = {
  create: function (input, extension) {
    // this can be either a wrapper object or wrapperPrototype
    var model = this;
    var wrapper = objectCreate(wrapperPrototype);
    var isArr = isArray(input);
    var isObj = isObject(input);
    var value = wrapper.value = isArr && [] || isObj && {} || input;
    var keys = wrapper.keys = (isArr || isObj) ? objectKeys(input) : [];
    var shifter = wrapper.shifter = model.shifter || {};

    shifter.owner = wrapper;

    if (model.shifter) {
      model.shifter = {owner: model};
    }

    var accessor = wrapper.accessor = {
      set: function (newValue) {
        return wrapper.set(newValue);
      }
    };

    // valueOf enables comparisons such as accessor == 2.
    // toJSON enables passing of accessor object inside JSON.stringify().
    accessor.get = accessor.valueOf = accessor.toJSON = constant(value);

    // Enables use in string contexts, such as 'a' + accessor would be 'ab'
    // when wrapper.value is ['b'].
    accessor.toString = function () {
      return value.toString();
    };

    accessor[namespace] = wrapper;

    keys.forEach(function (key) {
      var existing = extension && extension[key] || model.accessor[key];
      var child = accessor[key] = existing || wrapperPrototype.create(input[key]).accessor;

      value[key] = child.get();

      if (!existing && (shifter.internal || shifter.external)) {
        wrapper.watchKey(key);
      }
    });

    // Ensure correct array length property.
    if (isArr) {
      value.length = input.length;
    }

    return wrapper;
  },

  accessor: {},

  set: function (newValue) {
    var result = this.walk(newValue);

    if (result != this) {
      result.triggerObservers('internal');
    }

    return result.accessor;
  },

  walk: function (newValue) {
    var wrapper = this;
    var oldValue = wrapper.value;
    if (
      oldValue === newValue ||
      // Test for NaN value
      oldValue != oldValue && newValue != newValue
    ) {
      return wrapper;
    }

    var newChildren = wrapper.keys.reduce(function (accumulator, key) {
      var oldChild = wrapper.accessor[key][namespace];
      if (has(newValue, key)) {
        var newChild = oldChild.walk(newValue[key]);
        if (oldChild != newChild) {
          accumulator[key] = newChild.accessor;
        }
      }
      return accumulator;
    }, {});

    if (
      oldValue == null || newValue == null ||
      oldValue.constructor != newValue.constructor ||
      !isArray(oldValue) && !isObject(oldValue) ||
      !isArray(newValue) && !isObject(newValue) ||
      objectKeys(oldValue).join() != objectKeys(newValue).join() ||
      objectKeys(newChildren).length
    ) {
      wrapper = wrapper.create(newValue, newChildren);
      wrapper.triggerObservers('external');
    }

    return wrapper;
  },

  addObserver: function (observer, channel) {
    var wrapper = this;
    var shifter = wrapper.shifter;
    var observers = shifter[channel] || (shifter[channel] = []);

    observers.push(observer);

    if (!shifter.subs) {
      shifter.subs = [];
      wrapper.keys.forEach(wrapper.watchKey, wrapper);
    }

    return {
      dispose: function () {
        pull(observers, observer);

        if (!observers.length) {
          shifter[channel] = undefined;
        }

        if (shifter.subs && !shifter.internal && !shifter.external) {
          invoke(shifter.subs, 'dispose');
          shifter.subs = undefined;
        }
      }
    };
  },

  watchKey: function (key) {
    var shifter = this.shifter;
    shifter.subs.push(
      this.accessor[key][namespace].addObserver(function (newAccessor) {
        var wrapper = shifter.owner;
        var value = clone(wrapper.accessor.get());
        value[key] = newAccessor.get();

        var extension = {};
        extension[key] = newAccessor;

        var newWrapper = wrapper.create(value, extension);

        newWrapper.triggerObservers('external');
        newWrapper.triggerObservers('internal');
      }, 'internal')
    );
  },

  triggerObservers: function (channel) {
    var observers = this.shifter[channel];
    if (observers) {
      invoke(observers, 'call', this, this.accessor);
    }
  }
};

var ward = module.exports = function (value) {
  return wrapperPrototype.create(value).accessor;
};

ward.observe = function (object, observer) {
  return object[namespace].addObserver(observer, 'external');
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

  var targetValue = target.get();
  var i;
  var keys;
  var j;
  var key;

  if (!isObject(targetValue) && !isArray(targetValue)) {
    throw new TypeError('Can only assign to plain objects and arrays.');
  }

  targetValue = clone(targetValue);

  for (i = 1; i < arguments.length; i++) {
    source = arguments[i];

    if (source[namespace]) {
      source = source.get();
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

  return target.set(targetValue);
};
