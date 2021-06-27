'use strict';

const printTree = require('print-tree');
const qs = require('querystring');
const url_core = require('url');

const router_type = require('./router_type.js');
const Context = require('./Context.js');
const Reply = require('./Reply.js');


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

    this._cb_error = settings.error || async function(ctx, reply, error) { console.error(error); };
    this._cb_not_found = settings.not_found || async function (ctx, reply) {
      reply.status(404).send('NOT FOUND!\n');
    };
    this._cb_after_all = settings.after_all || async function (_ctx, _reply) {};

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
   * @param  {string}   url
   * @param  {Array}    middlewares
   * @param  {Function} cb - Promise<Function>
   */
  on(method, url, middlewares, cb) {
    var tree = this._methods[method.toLowerCase()];
    if (!tree) {
      throw new Error(`Not supported method "method"`);
    }
    middlewares = this._acccumulated_middlewares.concat(middlewares);
    tree.add(url, middlewares, cb);
  }


  async lookup(req, res) {
    var method = req.method;
    var url = req.url;
    var url_object = build_url_object(req);
    url = url_object.pathname;

    var result = this.find(method, url);
    var reply = new Reply(req, res);
    var ctx = this._create_context({ req, res, reply });
    if (!result || !result.node || !result.node._cb) {
      await this._cb_not_found(ctx, reply);
      await this._cb_after_all(ctx, reply);
      return;
    }

    var { node, params, middlewares } = result;
    // if (middlewares) {
    //   console.log({ node, params, middlewares });
    // }
    ctx.set('params', params);
    ctx.set('url_object', url_object);
    ctx.set('query', url_object.query);

    // TODO: Maybe use, express pattern via next ?
    for await (var mdw of middlewares) {
      try {
        var next = await mdw(ctx, req, res, reply);
        // if false, or Error then stop
        if (next === false || next instanceof Error) {
          // TODO: not yet required
          // var err = next === false ? new Middleware_stopped('Middleware was stopped') : next;
          // await this._cb_error(ctx, reply, err);
          await this._cb_after_all(ctx, reply);
          return;
        }
      } catch (err) {
        await this._cb_error(ctx, reply, err);
        await this._cb_after_all(ctx, reply);
        return;
      }
    }

    try {
      await node._cb(ctx, reply);
      await this._cb_after_all(ctx, reply);
    } catch (err) {
      await this._cb_error(ctx, reply, err);
      await this._cb_after_all(ctx, reply);
      return;
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
    var url = arg.shift();
    var cb = arg.pop();
    var middlewares = arg || [];

    if (!url || !cb) {
      throw new Error('Url and cb must be!');
    }
    return [ method, url, middlewares, cb ];
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
  use(...argv) {
    if (argv.length === 1) {
      // Add middleware for every node
      var middleware = arguments[0];
      this._acccumulated_middlewares.push(middleware);
    } else {
      let url = argv.shift();
      const router = argv.pop();
      const middlewares = this._acccumulated_middlewares.concat(argv || []);
      var methods = router._methods;
      var list = [];

      Object.keys(methods).forEach(name => {
        var childs = methods[name]._head.get_all_child();
        if (Object.keys(childs).length) {
          list.push({ method: name, childs });
        }
      });

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
  add(url, middlewares, cb) {
    // this._check_unique_template(url);

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
    // if (url === '/test') {
    //   console.log(url, this._head);
    // }
    return current;
  }


  append_childs(url, middlewares, childs) {
    // let node = this.add(url, [], null);
    let node;
    // case: router.use('/', router.get('/answer')) => /answer
    if (url === '/') {
      node = this._head;
    } else {
      node = this.add(url, [], null);
    }

    Object.keys(childs).forEach(k => {
      var sub_node = childs[k];
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
    // const log = /\/adm\/api\/exp\/1\/answer/.test(url) ? console.log : () => {};
    var parts = this._split_url(url);
    var current = this._head;
    var params = {};
    // var middlewares = [];
    // TODO: concat middleware
    // log({ parts });
    for (var i = 0, l = parts.length; i < l; i++) {
      var key = parts[i].replace(':', '');
      // log(key);
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
    // console.log('CUR', current);
    if (!current._cb) {
      var temp = current.get_child('/');
      if (temp && temp._cb) {
        current = temp;
      }
    }

    // var after_validate = this._validate_params(current.get_validator(), params);
    // if (after_validate === false) {
    //   return null;
    // }
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



  // _validate_params(validator, params) {
  //   var result = null;
  //   if (!validator || !validator.params) {
  //     return result;
  //   }
  //   var keys = Object.keys(params);
  //   for (var i = 0, l = keys.length; i < l; i++) {
  //     result = null;
  //     var key = keys[i];
  //     var how_validate = validator.params[key];
  //     if (!how_validate) {
  //       continue;
  //     }
  //     var value = params[key];
  //     if (typeof how_validate === 'string') {
  //       result = value === how_validate;
  //     } else if (how_validate instanceof router_type.Validator) {
  //       result = how_validate.validate(value);
  //       if (result === true) {
  //         params[key] = how_validate.parse(value);
  //       }
  //     }

  //     if (result === false) {
  //       return result;
  //     }
  //   }
  //   return result;
  // }
}


class Node {

  static transfuse(node_in, node_out) {
    Object.keys(node_in).forEach(k => {
      if (k.startsWith('_')) {
        node_out[k] = node_in[k];
      }
    });
    return node_out;
  }

  constructor(name, option = { cb: null }) {
    this._name = name;
    this._cb = option.cb;
    this._middlewares = [];

    this._child = {};
  }

  get_name() {
    return this._name;
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
  // set_validator(schema) {
  //   if (schema && schema.validator) {
  //     this._validator = schema.validator;
  //   }
  // }


  // get_validator() {
  //   return this._validator;
  // }


  get_dynamyc() {
    if (this._dynamyc) {
      return this._dynamyc;
    }

    var keys = Object.keys(this._child);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (key.startsWith(':')) {
        return this._dynamyc = this._child[key];
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


