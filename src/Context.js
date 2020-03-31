'use strict';

// Context

module.exports = class Context {

  constructor(ctx) {
    this._ctx = ctx || {};
  }

  /**
   * set
   * @param {string} key [description]
   * @param {*} val
   * @return {*} return after set
   * @throws {Error}
   */
  set(key, val) {
    let ctx = this._ctx;
    if(ctx[key]) {
      throw new Error(`context.set already exist value by key '${key}'`);
    } else {
      ctx[key] = val;
      return val;
    }
  }

  /**
   * get
   * @param  {string} key
   * @return {*}
   * @throws {NotExistKeyError} If not exist key
   */
  get(key) {
    let val = this._ctx[key];
    if (val || val === '' || val === 0 || val === false) {
      return val;
    } else {
      throw new Context.Not_exist_key_error(`context.get not exist value by key '${key}'`);
    }
  }

  /**
   * exist
   * @param  {string} key
   * @return {boolean}
   * @throws {Error}
   */
  exist(key) {
    try {
      this.get(key);
      return true;
    } catch (err) {
      if (err instanceof Context.Not_exist_key_error) {
        return false;
      } else {
        throw err;
      }
    }
  }
};


module.exports.Not_exist_key_error = class Not_exist_key_error extends Error {
  constructor(msg) {
    super(msg);
  }
};

