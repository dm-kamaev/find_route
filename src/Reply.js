'use strict';

const Collection = require('./Collection.js');

module.exports = class Reply {

  constructor(req, res) {
    this._status_code = 200;
    this._headers = new Collection([
      [ 'Content-type', 'text/html; charset=UTF-8' ]
    ]);
    this._req = req;
    this._res = res;
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


  /**
   * send
   * @param  {string | object} data
   */
  send(data) {
    if (data instanceof Object && data) {
      this.set_header('Content-type', 'application/json');
      data = JSON.stringify(data);
    }

    var res = this._res;
    var head =
      'HTTP/1.1 '+this._status_code+' OK\r\n'+
      this._build_headers()
    ;
    head += '\r\n';

    res.socket.write(head);
    res.socket.write(data);
    res.socket.end();
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