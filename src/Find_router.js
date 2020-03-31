'use strict';

const printTree = require('print-tree');
const qs = require('querystring');
const url_core = require('url');

const router_type = require('./router_type.js');
const Context = require('./Context.js');


module.exports = class Find_router {
  constructor(settings = {}) {
    this._methods = {
      get: new Tree('__GET__'),
      post: new Tree('__POST__'),
      put: new Tree('__PUT__'),
      delete: new Tree('__DELETE__'),
      patch: new Tree('__PATCH__'),
    };

    this._acccumulated_middlewares = [];

    this._cb_error = settings.error || async function(ctx, req, res, error){ console.error(error); };
    this._cb_not_found = settings.not_found || async function (ctx, req, res) {
      res.writeHead(404);
      res.write('NOT FOUND!\n');
      res.end();
    };

    this._init_methods();
  }


  /**
   * set_implement_context
   * @param {object} cb - function for must be implement method get and set
   */
  set_implement_context(cb) {
    this._create_context = cb;
  }

  /**
   * on
   * @param  {string}   method - GET || POST and etc
   * @param  {{ validator: { params: object }}}   schema
   * @param  {string}   url
   * @param  {Array}    middlewares
   * @param  {Function} cb - Promise<Function>
   */
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
    var url_object = build_url_object(req);
    url = url_object.pathname;

    var result = this.find(method, url);
    var ctx = this._create_context({ req, res });
    if (!result || !result.node || !result.node._cb) {
      return await this._cb_not_found(ctx, req, res);
    }

    var { node, params, middlewares } = result;
    ctx.set('params', params);
    ctx.set('url_object', url_object);
    ctx.set('query', url_object.query);

    // TODO: Maybe use, express pattern via next ?
    for await (var mdw of middlewares) {
      try {
        var next = await mdw(ctx, req, res);
        // if false, or Error then stop
        if (next === false || next instanceof Error) {
          var err = next === false ? new Error('Middleware was stopped') : next;
          return await this._cb_error(ctx, req, res, err);
        }
      } catch (err) {
        return await this._cb_error(ctx, req, res, err);
      }
    }

    try {
      await node._cb(ctx, req, res);
    } catch (err) {
      return await this._cb_error(ctx, req, res, err);
    }
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

  _create_context(data) {
    return new Context(data);
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
      var keys = Object.keys(node._child);
      if (!keys.length) {
        return [];
      } else {
        var res = [];
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
};


module.exports.type = router_type;


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

    var parts = this._split_url(url);
    var current = this._head;
    while (parts.length) {
      var key = parts.shift();
      var node = current.get_child(key);
      if (!node) {
        current = current.add_child(new Node(key, {}));
      } else {
        current = node;
      }
    }
    current.set_cb(cb);
    current.set_middlewares(middlewares);
    current.set_validator(schema);

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

    var after_validate = this._validate_params(current.get_validator(), params);
    if (after_validate === false) {
      return null;
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



  _validate_params(validator, params) {
    var result = null;
    if (!validator || !validator.params) {
      return result;
    }
    var keys = Object.keys(params);
    for (var i = 0, l = keys.length; i < l; i++) {
      result = null;
      var key = keys[i];
      var how_validate = validator.params[key];
      if (!how_validate) {
        continue;
      }
      var value = params[key];
      if (typeof how_validate === 'string') {
        result = value === how_validate;
      } else if (how_validate instanceof router_type.Validator) {
        result = how_validate.validate(value);
        if (result === true) {
          params[key] = how_validate.parse(value);
        }
      }

      if (result === false) {
        // console.log('----- false', validator, params, result);
        return result;
      }
    }
    // console.log('-----', validator, params, result);
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

  /**
   * set_validator
   * @param {{ validator: object }} schema
   */
  set_validator(schema) {
    if (schema && schema.validator) {
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


/**
 * build_url_object
 * @param  {request} req
 * @return {object}
 */
function build_url_object(req) {
  var url_obj = url_core.parse('http://'+req.headers.host+req.url, true);
  url_obj.pathname = qs.unescape(url_obj.pathname);
  url_obj.path = qs.unescape(url_obj.path);
  url_obj.href = qs.unescape(url_obj.href);
  url_obj.search = qs.unescape(url_obj.search);
  return url_obj;
}