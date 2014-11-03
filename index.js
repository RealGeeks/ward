'use strict';

var _ = require('lodash');
var isArray = _.isArray;
var isObject = _.isPlainObject;
var objectCreate = Object.create;
var objectKeys = Object.keys;
var extend = _.extend;
var namespace = '__ward__';

var wrapperPrototype = {
  create: function (value, extension) {
    // this can be either a wrapper object or wrapperPrototype
    var model = this;
    var wrapper = objectCreate(wrapperPrototype);

    var shifter = wrapper.shifter = model.shifter;

    wrapper.value = value;
    wrapper.keys = (isArray(value) || isObject(value)) ? objectKeys(value) : [];

    model.shifter = {};

    var accessor = wrapper.accessor = function (newValue) {
      if (arguments.length) {
        var result = wrapper.set(newValue);

        result[namespace].notifyUpstream();

        return result;
      }
      return value;
    };

    // Enables comparisons such as accessor == 2, when wrapper.value is 2.
    accessor.valueOf = accessor;

    // Enables use in string contexts, such as 'a' + accessor would be 'ab'
    // when wrapper.value is ['b'].
    accessor.toString = function () {
      return value.toString();
    };

    accessor[namespace] = wrapper;

    wrapper.keys.forEach(function (key) {
      accessor[key] = extension && extension[key] || model.accessor[key] ||
        wrapperPrototype.create(value[key]).accessor;

      if (shifter.observers && !accessor[key][namespace].shifter.upstream) {
        wrapper.watchKey(key);
      }
    });

    return wrapper;
  },

  accessor: _.noop,
  shifter: {},

  set: function (newValue) {
    var wrapper = this;
    var accessor = wrapper.accessor;
    var oldValue = wrapper.value;
    if (
      oldValue === newValue ||
      // Test for NaN value
      oldValue != oldValue && newValue != newValue
    ) {
      return accessor;
    }

    var newChildren = wrapper.keys.reduce(function (accumulator, key) {
      var oldChild = accessor[key];
      if (_.has(newValue, key)) {
        var newChild = oldChild(newValue[key]);
        if (oldChild != newChild) {
          accumulator[key] = newChild;
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
      wrapper.triggerObservers();
      accessor = wrapper.accessor;
    }

    return accessor;
  },

  addObserver: function (observer) {
    var wrapper = this;
    var shifter = wrapper.shifter;
    var observers = shifter.observers || (shifter.observers = []);

    observers.push(observer);

    if (!shifter.subs) {
      shifter.subs = [];
      wrapper.keys.forEach(wrapper.watchKey, wrapper);
    }

    return {
      dispose: function () {
        _.pull(observers, observer);

        if (!observers.length) {
          _.invoke(shifter.subs, 'dispose');
          shifter.subs = shifter.observers = undefined;
        }
      }
    };
  },

  addUpstream: function (observer) {
    var shifter = this.shifter;
    var observers = shifter.upstream || (shifter.upstream = []);
    observers.push(observer);

    return {
      dispose: function () {
        _.pull(observers, observer);

        if (!observers.length) {
          shifter.upstream = undefined;
        }
      }
    };
  },

  watchKey: function (key) {
    var wrapper = this;
    wrapper.shifter.subs.push(
      wrapper.accessor[key][namespace].addUpstream(function (newAccessor) {
        var value = _.clone(wrapper.accessor());
        value[key] = newAccessor();

        var extension = {};
        extension[key] = newAccessor;

        var newWrapper = wrapper.create(value, extension);

        newWrapper.triggerObservers();
        newWrapper.notifyUpstream();
      })
    );
  },

  triggerObservers: function () {
    var observers = this.shifter.observers;
    if (observers) {
      _.invoke(observers, 'call', this, this.accessor);
    }
  },

  notifyUpstream: function () {
    var observers = this.shifter.upstream;
    if (observers) {
      _.invoke(observers, 'call', this, this.accessor);
    }
  }
};

var ward = module.exports = function (value) {
  return wrapperPrototype.create(value).accessor;
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
