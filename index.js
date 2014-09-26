'use strict';

var _ = require('lodash');
var Emitter = require('eventemitter2').EventEmitter2;
var create = Object.create;
var namespace = '__ward__';

function Wrapper(value, path) {
  var wrapper = this;

  wrapper.keys = [];
  wrapper.path = path;

  var accessor = wrapper.accessor = function (newValue) {
    if (newValue !== undefined) {
      return wrapper.set(newValue);
    }
    return wrapper.value;
  };

  accessor[namespace] = wrapper;
  accessor(value);

  return accessor;
}

var WrapperPrototype = {
  set: function (newValue) {
    var wrapper = this;
    // Bail if the new value is equivalent to the old.
    if (_.isEqual(wrapper.value, newValue)) {
      return false;
    }

    wrapper.value = newValue;

    if (wrapper.parent) {
      wrapper.parent.value[wrapper.path[wrapper.path.length - 1]] = newValue;
    }

    wrapper.clean();
    wrapper.walk(newValue);
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

  walk: function (newValue) {
    var wrapper = this;
    if (_.isArray(newValue) || _.isPlainObject(newValue)) {
      _.each(newValue, function (value, key) {
        wrapper.accessor[key] = wrapper.create(value, wrapper.path.concat(key));
        wrapper.keys.push(key);
      });
    }
  }
};

var ward = module.exports = function (value) {
  var prototype = create(new Emitter({wildcard: true}));

  _.extend(prototype, WrapperPrototype);

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
