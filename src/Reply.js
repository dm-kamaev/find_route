'use strict';

const Collection = require('./Collection.js');
const Cookie_manager = require('./Cookie_manager.js');

module.exports = class Reply {

  constructor(req, res) {
    this.status(200);
    this._headers = new Collection([
      [ 'Content-type', 'text/html; charset=UTF-8' ]
    ]);
    this._req = req;
    this._res = res;

    this._cookie_manager = new Cookie_manager(req);
  }

  /**
   * set_cookie
   * @param {string} name
   * @param {string} value
   * @param {{ name: string, value: string, days_to_live: number, domain?: string } | Array<{ name: string, value: string, days_to_live: number, domain: string }>} option
   * { name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' }
   * ||
   * [{ name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' }]

   */
  set_cookie(list) {
    this._cookie_manager.set(list);
    return this;
  }


  /**
   * status
   * @param  {number} code
   * @return {Reply}
   */
  status(code) {
    this._status_code = parseInt(code, 10);
    return this;
  }


  get_status_code() {
    return this._status_code;
  }



  /**
   * set_header
   * @param {string} name - header name
   * @param {string} val - value for header
   * @return {Reply}
   */
  set_header(name, val) {
    this._headers.set(name.trim(), val);
    return this;
  }


  get_headers() {
    var res = {};
    this._headers.foreach((val, name) => {
      res[name] = val;
    });

    return res;
  }


  /**
   * send
   * @param  {string | object} data
   */
  send(data) {
    if (data instanceof Object && data) {
      this.set_header('Content-type', 'application/json');
      data = JSON.stringify(data);
    }

    const res = this._res;
    let head =
      'HTTP/1.1 '+this._status_code+' OK\r\n'+
      this._cookie_manager.get_all_with_header()+
      'X-XSS-Protection: 1; mode=block\r\n' +
      'X-FRAME-OPTIONS: DENY\r\n'+
      this._build_headers()
    ;
    head += '\r\n';

    res.socket.write(head);
    res.socket.write(this._body = data);
    res.socket.end();
  }


  /**
   * redirect
   * @param  {string} url
   * @param  {Number} status -  301 - Permanently, 302 - Temporarily
   */
  redirect(url, status = 302) {
    const stop_browser_cache =
       'Expires: Mon, 26 Jul 1997 05:00:00 GMT\r\n' +
       'Cache-Control: no-cache, must-revalidate\r\n'+
       'Pragma: no-cache\r\n';

    let head =
      'HTTP/1.1 '+redirect_status+'\r\n' +
      this._cookie_manager.get_all_with_header()+
      stop_browser_cache +
      'Location: '+new_location+'\r\n'+
      '\r\n'
    ;

    res.socket.write(head);
    res.socket.end();
  }


  get_body() {
    return this._body;
  }



  _build_headers() {
    var list = [];
    this._headers.foreach((val, name) => {
      list.push(name+': '+val+'\r\n');
    });
    return list.join('');
  }

};

// console.log(new Reply({}, {}).status(200).send([1,2,3,45,6]));