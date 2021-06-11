'use strict';

// Cookies manager

const qs = require('querystring');
// const oop = require('/r_m/nodejs/my/oop.js');

module.exports = class Cookie_manager {
  constructor(req) {
    this._req = req;
    this._list = [];
  }

  /**
   * set -  set one or list
   * @param {object} CONTEXT           [description]
   * @param {object{ name: string, value: string, days_to_live: number, domain: string } || object{ name: string, value: string, days_to_live: number, domain: string }[]} list_data_cookies
   * { name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' }
   * ||
   * [{ name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' }]
   */
  set(list_data_cookies) {
    var cookie;
    if (list_data_cookies instanceof Array) {
      for (var i = 0, l = list_data_cookies.length; i < l; i++) {
        cookie = cookies_api.create(this._req, list_data_cookies[i]);
        this._list.push(cookie);
      }
    } else {
      cookie = cookies_api.create(this._req, list_data_cookies);
      this._list.push(cookie);
    }
  }

  // получить все куки, которые мы установили во время запроса
  // return @string –– or empty
  get_all_with_header() {
    var len = this._list.length;
    if (len === 0) {
      return '';
    } else if (len === 1) {
      return 'Set-Cookie: '+this._list[0]+'\r\n';
    } else if (len > 1) {
      return 'Set-Cookie: '+this._list.join('\r\nSet-Cookie: ')+'\r\n';
    }
  }

}

// const Install_cookie = oop.define_class2('Install_cookie', function (me) {
//   var _CONTEXT;
//   var _new_cookies = [];

//   me.new = function (CONTEXT) {
//     var instanse = CONTEXT[KEY];
//     _CONTEXT = CONTEXT;
//     if (instanse) {
//       return instanse;
//     } else {
//       return CONTEXT.set(KEY, me);
//     }
//   };

//   /**
//    * set: set one or list
//    * @param {object} CONTEXT           [description]
//    * @param {object{ name: string, value: string, days_to_live: number, domain: string } || object{ name: string, value: string, days_to_live: number, domain: string }[]} list_data_cookies
//    * { name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' }
//    * ||
//    * [{ name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' }]
//    */
//   me.set = function (list_data_cookies) {
//     var cookie;
//     if (list_data_cookies instanceof Array) {
//       for (var i = 0, l = list_data_cookies.length; i < l; i++) {
//         cookie = cookies_api.create(_CONTEXT, list_data_cookies[i]);
//         _new_cookies.push(cookie);
//       }
//     } else {
//       cookie = cookies_api.create(_CONTEXT, list_data_cookies);
//       _new_cookies.push(cookie);
//     }
//   };

//   /**
//    * remove: remove via set cookie with days_to_live = 0;
//    * @param  {object{} object{}[]} list_data_cookies:
//    * { name: 'B', domain: 'test.ru' }
//    * ||
//    * [ { name: 'B', domain: 'test.ru' } ]
//    */
//   me.remove = function (list_data_cookies) {
//     if (list_data_cookies instanceof Array) {
//       for (var i = 0, l = list_data_cookies.length; i < l; i++) {
//         list_data_cookies[i].days_to_live = 0;
//         list_data_cookies[i].value = '';
//       }
//     } else {
//       list_data_cookies.days_to_live = 0;
//       list_data_cookies.value = '';
//     }
//     me.set(list_data_cookies);
//   };

//   // получить все куки, которые мы установили во время запроса
//   // return @string –– or empty
//   me.get_all_installed = function () {
//     var len = _new_cookies.length;
//     if (len === 0) {
//       return '';
//     } else if (len === 1) {
//       return 'Set-Cookie: '+_new_cookies[0]+'\r\n';
//     } else if (len > 1) {
//       return 'Set-Cookie: '+_new_cookies.join('\r\nSet-Cookie: ')+'\r\n';
//     }
//   };

// });

// check instanse in CONTEXT
// return @instanse || @boolean
// Install_cookie.exist_in = function (CONTEXT) {
//   var instanse = CONTEXT[KEY];
//   return (instanse) ? instanse : false;
// };


// COOKIES API

const cookies_api = {};

// creat one cook
// params {object} –– { name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru', expires: new Date() }
// return {string} –– us_name=John; max-age=345600; path=/; domain=test.ru;
cookies_api.create = function (req, params) {
  var name = params.name;
  var value = params.value;
  var days_to_live = params.days_to_live;
  var expires = params.expires;
  var domain = params.domain;
  if (!domain) {
    domain = req.headers.host;
  }
  var cookie = name + '=' + qs.escape(value);
  if (typeof days_to_live === 'number') {
    cookie += '; max-age=' + (days_to_live * 60 * 60 * 24);
  } else {
    throw new Error('[find_router]: set => days_to_live is not digit "'+days_to_live+'"')
  }

  if (expires !== undefined && typeof expires === 'number') {
    cookie += '; expires=' + expires;
  }

  cookie += '; path=/; domain='+domain+';';
  return cookie;
};
// console.log(cookies_api.create({ req: { headers: {host: 'test.ru' }}}, { name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' }));