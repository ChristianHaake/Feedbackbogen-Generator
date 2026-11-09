'use strict';

function emptyTarget(value) {
  return Array.isArray(value) ? [] : {};
}

function getEnumerableOwnPropertySymbols(target) {
  return Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(target).filter((symbol) => Object.prototype.propertyIsEnumerable.call(target, symbol))
    : [];
}

function getKeys(target) {
  return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
}

function propertyIsOnObject(object, property) {
  try {
    return property in object;
  } catch {
    return false;
  }
}

function propertyIsUnsafe(target, key) {
  return propertyIsOnObject(target, key)
    && !(Object.prototype.hasOwnProperty.call(target, key)
      && Object.prototype.propertyIsEnumerable.call(target, key));
}

function setOwnProperty(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function isMergeableObject(value) {
  return !!value && typeof value === 'object'
    && Object.prototype.toString.call(value) !== '[object RegExp]'
    && Object.prototype.toString.call(value) !== '[object Date]'
    && value.$$typeof !== (typeof Symbol === 'function' && Symbol.for ? Symbol.for('react.element') : 0xeac7);
}

function cloneUnlessOtherwiseSpecified(value, options) {
  return options.clone !== false && options.isMergeableObject(value)
    ? deepmerge(emptyTarget(value), value, options)
    : value;
}

function defaultArrayMerge(target, source, options) {
  return target.concat(source).map((element) => cloneUnlessOtherwiseSpecified(element, options));
}

function getMergeFunction(key, options) {
  if (!options.customMerge) return deepmerge;
  const customMerge = options.customMerge(key);
  return typeof customMerge === 'function' ? customMerge : deepmerge;
}

function mergeObject(target, source, options) {
  const destination = {};
  if (options.isMergeableObject(target)) {
    getKeys(target).forEach((key) => {
      setOwnProperty(destination, key, cloneUnlessOtherwiseSpecified(target[key], options));
    });
  }
  getKeys(source).forEach((key) => {
    if (propertyIsUnsafe(target, key)) return;
    const value = propertyIsOnObject(target, key) && options.isMergeableObject(source[key])
      ? getMergeFunction(key, options)(target[key], source[key], options)
      : cloneUnlessOtherwiseSpecified(source[key], options);
    setOwnProperty(destination, key, value);
  });
  return destination;
}

function deepmerge(target, source, options = {}) {
  options.arrayMerge = options.arrayMerge || defaultArrayMerge;
  options.isMergeableObject = options.isMergeableObject || isMergeableObject;
  options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
  return Array.isArray(source) === Array.isArray(target)
    ? Array.isArray(source)
      ? options.arrayMerge(target, source, options)
      : mergeObject(target, source, options)
    : cloneUnlessOtherwiseSpecified(source, options);
}

deepmerge.all = function deepmergeAll(values, options) {
  if (!Array.isArray(values)) throw new Error('first argument should be an array');
  return values.reduce((previous, next) => deepmerge(previous, next, options), {});
};

module.exports = deepmerge;
