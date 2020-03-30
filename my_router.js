'use strict';

// TODO: add router.lookup
// TODO: add router.get
// TODO: add router.post
// TODO: add router.put
// TODO: add router.delete
// TODO: validate dynamic params
const printTree = require('print-tree');
const qs = require('querystring');
// const asc = require('/r_m/nodejs/my/asc.js');

module.exports = class Routing {
  constructor(settings = {}) {
    this._methods = {
      get: new Tree('__GET__'),
      post: new Tree('__POST__'),
      put: new Tree('__PUT__'),
      delete: new Tree('__DELETE__'),
      patch: new Tree('__PATCH__'),
    };

    this._acccumulated_middlewares = [];

    this._cb_error = settings.handler_error || async function(){};
    this._cb_not_found = settings.not_found || async function(){};

    this._init_methods();
  }

  on(method, schema = {}, url, middlewares = [], cb) {
    var tree = this._methods[method.toLowerCase()];
    if (!tree) {
      throw new Error('Not support method '+method);
    }
    middlewares = this._acccumulated_middlewares.concat(middlewares);
    tree.add(schema, url, middlewares, cb);
  }

  async lookup(req, res) {
    var method = req.method;
    var url = req.url;
    var result = this.find(method, url);
    var ctx = { req, res };
    if (!result || !result.node || !result.node._cb) {
      // throw new Error(`Not found route for url ${method} ${url}`);
      return await this._cb_not_found(ctx, req, res);
    }
    var { node, params, middlewares } = result;
    ctx.params = params;
    // TODO: Maybe use, express pattern via next ?
    for await (var mdw of middlewares) {
      try {
        var next = await mdw(ctx, req, res);
        if (!next) {
          return console.error('Call skip');
        }
      } catch (err) {
        return this._cb_error(ctx, req, res, err);
      }
    }
    // console.log(node);
    // add support context
    node._cb(ctx, req, res);
  }


  _init_methods() {
    var me = this;
    Object.keys(me._methods).forEach(method => {
      me[method] = function (...arg) {
        var params = me._parse_arg(method, arg);
        me.on.apply(me, params);
      };
    });
  }


  // console.log(parse_arg({ name: 'test' }, '/dsfsf', [async function () {}], async function cb() {}));
  // console.log(parse_arg({ name: 'test' }, '/dsfsf', async function cb() {}));
  // console.log(parse_arg('/dsfsf', async function cb() {}));
  // console.log(parse_arg('/dsfsf', [async function () {}], async function cb() {}));
  _parse_arg(method, arg) {
    var schema;
    var url;
    var middlewares;
    var cb = arg.pop();

    var first = arg.shift();
    if (typeof first === 'string') {
      url = first;
      middlewares = arg.shift();
    } else {
      schema = first;
      url = arg.shift();
      middlewares = arg.shift();
    }
    if (!url || !cb) {
      throw new Error('Url and cb must be!');
    }
    // console.log();
    // console.log();
    // console.log([ method, schema || {}, url, middlewares || [], cb ]);
    return [ method, schema || {}, url, middlewares || [], cb ];
  }


  find(method, url) {
    var tree = this._methods[method.toLowerCase()];
    if (!tree) {
      return null;
    }

    return tree.find(url);
  }


  // middleware
  // url, middlewares, router
  use() {
    var url, middlewares, router;
    if (arguments.length === 1) {
      // Add middleware for every node
      var middleware = arguments[0];
      this._acccumulated_middlewares.push(middleware);
    } else if (arguments.length === 3) {
      ([ url, middlewares, router ] = arguments);
      var methods = router._methods;
      var list = [];
      Object.keys(methods).forEach(name => {
        var childs = methods[name]._head.get_all_child();
        if (Object.keys(childs).length) {
          list.push({ method: name, childs });
        }
      });
      middlewares = this._acccumulated_middlewares.concat(middlewares);
      // console.log(list);
      list.forEach(el => {
        var tree = this._methods[el.method];
        tree.append_childs(url, middlewares, el.childs);
        // console.dir(tree._head, { depth: 20, colors: true });
        // global.process.exit();
      });
    }
  }


  print_routers() {
    const iterate = function (node) {
      if (!Object.keys(node._child).length) {
        return [];
      } else {
        var res = [];
        var keys = Object.keys(node._child);
        for (var i = 0, l = keys.length; i < l; i++) {
          var key = keys[i];
          var current = node._child[key];
          res.push({
            name: current._name,
            children: iterate(current)
          });
        }
        return res;
      }
    };

    iterate(this._methods.get._head).forEach(el => {
      el.name = 'GET '+el.name;
      printTree(
        el,
        node => { return node.name; },
        node => { return node.children; },
      );
    });
  }
}


class Tree {
  /**
   * constructor
   * @param  {string} name
   */
  constructor(name) {
    this._head = new Node(name || '__ROOT__');

    this._unique_path = {};
  }


  /**
   * add
   * @param {object}   schema
   * @param {string}   url
   * @param {function[]} middlewares
   * @param {Node} cb
   */
  add(schema, url, middlewares, cb) {

    this._check_unique_template(url);

    // this._check_unique_template(url);

    var parts = this._split_url(url);
    var current = this._head;

    while (parts.length) {
      var key = parts.shift();
      // TODO: CHECK DUPLICATE
      var node = current.get_child(key);
      if (!node) {
        // console.log('APPEND', current, key);
        current = current.add_child(new Node(key, {}));
      } else {
        current = node;
      }
    }
    current.set_cb(cb);
    current.set_middlewares(middlewares);
    current.set_schema(schema);
    return current;
  }


  append_childs(url, middlewares, childs) {
    var node = this.add({}, url, [], null);
    Object.keys(childs).forEach(k => {
      var sub_node = childs[k];
      // console.log(this._head);global.process.exit();
      node.add_child(sub_node);
    });

    const iterate = function (node) {
      var childs = node.get_all_child();
      if (!Object.keys(childs).length) {
        return;
      } else {
        Object.keys(childs).forEach(k => {
          var sub_node = childs[k];
          // console.log(this._head);global.process.exit();
          sub_node.unshift_middlewares(middlewares);
          iterate(sub_node);
        });
      }
    };

    iterate(node);
    // console.dir(node, { depth: 20, colors: true }); global.process.exit();
  }


  /**
   * find
   * @param  {string} url
   * @return {Node | null}
   */
  find(url) {
    var parts = this._split_url(url);
    var current = this._head;
    var params = {};
    // var middlewares = [];
    // TODO: concat middleware
    for (var i = 0, l = parts.length; i < l; i++) {
      var key = parts[i].replace(':', '');
      var node = current.get_child(key);
      // console.log(key, node);
      if (!node) {
        // console.log('DEBUG', key, node);
        node = current.get_dynamyc();
        if (!node) {
          return null;
        }

        var out_key = node._name.replace(':', '');
        var value = parts[i];
        var { after_validate, val } = this._validate_params(node.get_validator(), out_key, value);
        if (after_validate === false) {
          return null;
        }
        value = val;
        params[out_key] = value;
        // console.log('params= ', params);
      }
      current = node;
    }
    if (!current._cb) {
      var temp = current.get_child('/');
      if (temp && temp._cb) {
        current = temp;
      }
    }
    return { node: current, params, middlewares: current.get_middlewares() };
  }

  /**
   * _split_url
   * @param  {string} url
   * @return {string[]}
   */
  _split_url(url) {
    if (url === '/') {
      return ['/'];
    } else {
      return url.split('/').filter(Boolean).map(qs.unescape);
    }
  }


  _check_unique_template(url){
    var key_for_unique = url.replace(/\/:.+\//, '/__DYNAMIC__/');

    if (this._unique_path[key_for_unique]) {
      throw new Error(`Duplicate template url, previous template ${this._unique_path[key_for_unique]}`);
    } else {
      this._unique_path[key_for_unique] = url;
    }
  }


  /**
   * _validate_params
   * @param  {{ [params]: object }?} validator - optional params
   * @param  {string} key
   * @param  {string} value
   * @return {{ after_validate: null | boolean, val: any }} if null then skip, else true/false
   */
  _validate_params(validator, key, value) {
    var result = { after_validate: null, val: value };
    if (!validator || !validator.params || !validator.params[key]) {
      return result;
    }
    var how_validate = validator.params[key];

    if (typeof how_validate === 'string') {
      result.after_validate = value === how_validate;
    } else if (how_validate instanceof RegExp) {
      result.after_validate = how_validate.test(value);
      if (result.after_validate === true) {
        if (how_validate instanceof Number_param) {
          result.val = parseInt(value, 10);
        }
      }
    }
    return result;
  }
}


class Node {
  constructor(name, option = { cb: null }) {
    this._name = name;
    this._cb = option.cb;
    this._middlewares = [];

    this._child = {};
  }

  get_all_child() {
    return this._child;
  }

  get_child(name) {
    return this._child[name];
  }


  add_child(node) {
    this._child[node._name] = node;
    return this._child[node._name];
  }

  set_cb(cb) {
    this._cb = cb;
  }

  set_middlewares(middlewares) {
    this._middlewares = middlewares;
  }

  unshift_middlewares(middlewares) {
    this._middlewares = middlewares.concat(this._middlewares);
  }

  get_middlewares() {
    return this._middlewares;
  }

  set_schema(schema) {
    if (schema.name) {
      this._url_name = schema.name;
    }

    if (schema.validator) {
      this._validator = schema.validator;
    }
  }


  get_validator() {
    return this._validator;
  }


  // TODO: cache call
  get_dynamyc() {
    var keys = Object.keys(this._child);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (key.startsWith(':')) {
        return this._child[key];
      }
    }
    return false;
  }

}


class Number_param extends RegExp {
  constructor() {
    super('^\\d+$');
  }
}

