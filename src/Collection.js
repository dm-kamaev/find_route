'use strict';

// САМОПИСНЫЙ HASH ORER


module.exports = class Collection {

  /**
   * constructor
   * @param  {array[string, * ]} data:
   * [ [ key, {name: 'Vasya'} ], [ key, { name: 'Petya' } ] ]
   * [ 'key', 'key1' ]
   */
  constructor(data) {
    data = data || [];
    this._hash = {};
    this._keys = [];

    for (var i = 0, l = data.length; i < l; i++) {
      var el = data[i];
      var key;
      // if array is one-dimensional
      if (!(el instanceof Array)) {
        key = el;
        this._hash[key] = key;
        this._keys.push(key);
        continue;
      }
      // if array is two-dimensional
      key = el[0];
      var value = el[1];
      this._hash[key] = value;
      this._keys.push(key);
    }
  }

  /**
   * set
   * @todo: add support set value with key, which object(use new Set)
   * @param {string} key:
   * @param {*} value
   */
  set(key, value) {
    if (!this._hash[key]) {
      this._keys.push(key);
    }
    this._hash[key] = value;
  }

  /**
   * get
   * @param  {string} key:
   * @return {*}
   */
  get(key) {
    return this._hash[key];
  }


  /**
   * get_first
   * @return {*}
   */
  // get_first() {
  //   return this._hash[this._keys[0]];
  // }

  get_first_el() {
    var key = this._keys[0];
    return { key, value: this._hash[key] };
  }

  /**
   * get_el_by_index:
   * @param  {string} index: '1'
   * @return {object{ key: string, value: any }} { key: 'vasya', value: 'petya' }
   */
  get_el_by_index(index) {
    var key = this._keys[index];
    return { key, value: this._hash[key] };
  }

  /**
   * get_first_value: get first value in hash
   * @return {any}
   */
  get_first_value() {
    return this.get_el_by_index(0).value;
  }

  /**
   * get_first_value: get last value in hash
   * @return {any}
   */
  get_last_value() {
    return this.get_el_by_index(this._keys.length - 1).value;
  }

  /**
   * get_keys:
   * @return {string[]}
   */
  get_keys() {
    return this._keys;
  }


  /**
   * foreach
   * @param  {Function(value, key)} handler(*, string)
   */
  foreach(handler) {
    var hash = this._hash;
    var keys = this.get_keys();
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      var value = hash[key];
      handler(value, key);
    }
  }

  /**
   * remove
   * @param  {string} key
   */
  // remove(key) {
  //   this._hash[key] = null;
  //   for (var i = 0, l = this._keys.length; i < l; i++) {
  //     var internal_key = this._keys[i];
  //     if (internal_key === key) {
  //       internal_key = null;
  //     }
  //   }
  // }

  // clean() {
  //   this._keys = [];
  //   this._hash = {};
  // }

  toString() {
    var res = 'Collection { ';
    this.foreach((val, key) => {
      if (key instanceof Object) {
        key = JSON.stringify(key);
      }
      if (val instanceof Object) {
        val = JSON.stringify(val);
      }

      res += '\''+[key]+'\': '+[val]+',';
    });
    return res+' }';
  }

};

// TEST1
// const assert = require('assert');
// var Collection = module.exports;
// var hash_order = new Collection([ ['key', {name: 'Vasya'}], ['key1', {name: 'Petya'}] ]);
// console.log(hash_order.set('key1', /\s+/));
// hash_order.foreach((value, key) => {
//   console.log(value, key);
// });
// console.log(hash_order.get('key1', /\s+/));

// TEST2
// const assert = require('assert');
// var Collection = module.exports;
// var ar = [ 'create.html', 'success.html', 'fail.html' ];
// const hash_order = new Collection(ar);
// var count = 0;
// hash_order.foreach((value, key) => {
//   assert.ok(value === key);
//   count++;
// });
// assert.ok(count === ar.length);

// TEST3
// const assert = require('assert');
// var Collection = module.exports;
// var ar = [ 'create.html', 'success.html', 'fail.html', [ 'test', { name: [ {title: 'test'}]} ] ];
// const collection = new Collection(ar);
// var count = 0;
// collection.foreach((value, obj_key) => {
//   console.log(obj_key);
//   assert.ok(value === obj_key);
//   count++;
// });
// assert.ok(count === ar.length);

