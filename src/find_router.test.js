'use strict';

const http = require('http');
const axios = require('axios');
const get_port = require('get-port');

const Find_router = require('./Find_router.js');

const num = Find_router.type.num;

let r = new Find_router({
  error: async function (ctx, reply, error) {
    console.log('HANDLER_ERROR: ', error);
    reply.status(500).send('INTERNAL ERROR');
  },
  not_found: async function (ctx, reply) {
    console.log(`Not found route for url ${ctx.get('req').method} ${ctx.get('req').url}`);
    reply.status(404).send('NOT FOUND');
  },

  // after_all: function (ctx, req, res) {
  //   console.log('AFTER ALL', res.statusCode, res.getHeaders(), res.body);
  // }
});

var middlewares = [
  async function (ctx, reply) {
    console.log('CALL MIDDLEWARE');
    return true;
  }
];

r.use(async function (ctx, reply) {
  console.log('CALL GLOBAL MIDDLEWARE');
  return true;
});

r.get('/adm/api/exp', middlewares, function (ctx, reply) {
  console.log('GET /adm/api/exp', ctx.get('params'));
  reply.send(ctx.get('req').method+' /adm/api/exp');
  // write_responce(ctx, ctx.get('req').method+' /adm/api/exp');
});

r.get('/adm/api/exp/:poll_id', [], function (ctx, reply) {
  console.log('GET /adm/api/exp/:poll_id', ctx.get('params'));
  reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
});

r.post('/adm/api/exp', [], function (ctx, reply) {
  console.log('POST /adm/api/exp', ctx.get('params'));
  reply.send(ctx.get('req').method+' /adm/api/exp');
});

r.put('/adm/api/exp/:poll_id', [], function (ctx, reply) {
  console.log('PUT /adm/api/exp/:poll_id', ctx.get('params'));
  reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
});

r.delete({ validator: { params: { poll_id: num } } }, '/adm/api/exp/:poll_id', [], function (ctx, reply) {
  console.log('DELETE /adm/api/exp/:poll_id', ctx.get('params'));
  reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
});


r.post('/adm/api/exp/throw', async function () {
  throw new Error('test error');
});


function get_router_answer() {
  var r = new Find_router();
  r.get('/', [], function (ctx, reply) {
    console.log(`${ctx.get('req').method} ${ctx.get('req').url}`, ctx.get('params'));
    reply.send(ctx.get('req').method+' '+ctx.get('req').url);
  });

  r.get({ validator: { params: { poll_id: num, answer_id: num } } }, '/:answer_id', [], function (ctx, reply) {
    console.log(`${ctx.get('req').method} ${ctx.get('req').url}`, ctx.get('params'));
    reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
  });

  r.post('/', function (ctx, reply) {
    console.log(`${ctx.get('req').method} ${ctx.get('req').url}`, ctx.get('params'));
    reply.send(ctx.get('req').method+' '+ctx.get('req').url);
  });

  r.put('/:answer_id', function (ctx, reply) {
    console.log(`${ctx.get('req').method} ${ctx.get('req').url}`, ctx.get('params'));
    reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
  });

  r.delete('/:answer_id', function (ctx, reply) {
    console.log(`${ctx.get('req').method} ${ctx.get('req').url}`, ctx.get('params'));
    reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
  });

  r.get({ validator: { params: { poll_id: num, answer_id: num } } }, '/:answer_id/file1/file2', [async function () {
    console.log('CALL BEFORE FILE');
    return true;
  }], function (ctx, reply) {
    console.log(`${ctx.get('req').method} ${ctx.get('req').url}`, ctx.get('params'));
    reply.send(ctx.get('req').method+' '+ctx.get('req').url);
  });
  return r;
}

var router_answer = get_router_answer();
r.use('/adm/api/exp/:poll_id/answer', [async function () {
  console.log('MIDDLEWARE FOR ANSWER\n\n\n');
  return true;
}], router_answer);

describe('Find router', function() {
  test('Routing success', async function () {
  // void async function () {
    let { server, host } = await create_server(r);

    const req = axios.create({
      baseURL: host,
      validateStatus: function () { return true; },
    });

    let list = [
      { method: 'GET', url: '/adm/api/exp', },
      { method: 'GET', url: '/adm/api/exp/1', },
      { method: 'POST', url: '/adm/api/exp', },
      { method: 'PUT', url: '/adm/api/exp/1', },
      { method: 'DELETE', url: '/adm/api/exp/1', },

      { method: 'GET', url: '/adm/api/exp/1/answer' },
      { method: 'GET', url: '/adm/api/exp/1/answer/1' },
      { method: 'POST', url: '/adm/api/exp/1/answer' },
      { method: 'PUT', url: '/adm/api/exp/1/answer/1' },
      { method: 'DELETE', url: '/adm/api/exp/1/answer/1' },

      { method: 'GET', url: '/adm/api/exp/1/answer/1/file1/file2' }
    ];

    for await (var el of list) {
      // await call_request(req, el.method, el.url);
      let { status, data } = await req[el.method.toLowerCase()](el.url);
      expect(status).toBe(200);
      expect(data).toBe(el.method+' '+el.url);
    }

    let status, data;

    ({ status, data } = await req.get('/adm/api/exp/1/answer/aadad/file1/file2'));
    expect(status).toBe(404);
    expect(data).toBe('NOT FOUND');

    ({ status, data } = await req.get('/adm/api/exp/1/answer/1aadsadadad'));
    expect(status).toBe(404);
    expect(data).toBe('NOT FOUND');

    ({ status, data } = await req.get('/adm/api/exp/1/answer/1aadsadadad/asdadasdasdsa'));
    expect(status).toBe(404);
    expect(data).toBe('NOT FOUND');

    ({ status, data } = await req.post('/adm/api/exp/throw'));
    expect(status).toBe(500);
    expect(data).toBe('INTERNAL ERROR');


    server.close();
  });

  test('Middleware', async function() {

    let mock = jest.fn(async (ctx, req, res) => {
      expect(ctx).toHaveProperty('get');
      expect(ctx).toHaveProperty('set');

      expect(req).toHaveProperty('method');
      expect(req).toHaveProperty('url');

      expect(res).toHaveProperty('socket');
      expect(res).toHaveProperty('end');

      return true;
    });

    let r = new Find_router();
    r.use(mock);

    r.get('/', [ mock ], async function(ctx) {
      expect(ctx.get('url_object')).toMatchObject({
        pathname: expect.any(String),
        query: expect.any(Object)
      });

      let { 'page[num]': num, 'page[size]': size } = ctx.get('query');
      expect(num).toBe('2');
      expect(size).toBe('10');
      write_responce(ctx, 'Ok');
    });

    r.use('/answer', [ mock ], get_router_answer());

    let { server, host } = await create_server(r);
    const req = axios.create({
      baseURL: host,
      validateStatus: function () { return true; },
    });

    await req.get('/?page[num]=2&page[size]=10');
    await req.get('/answer/1');

    expect(mock).toHaveBeenCalledTimes(4);

    server.close();
  });
});




function write_responce(ctx, data, status) {
  var res = ctx.get('res');
  var head = 'HTTP/1.1 '+(status || 200)+' OK\r\n'+ 'Content-type: text/html; charset=UTF-8\r\n';
  head += '\r\n';
  res.socket.write(head);
  res.socket.write(data);
  res.socket.end();
}


async function create_server(router) {
  let port = await get_port();
  return await new Promise((resolve, reject) => {
    var server = http.createServer(async (req, res) => {
      await router.lookup(req, res);
    });
    server.listen(port, err => {
      if (err) {
        return reject(err);
      }
      console.log('Server listening on: http://localhost:3000');
      resolve({ server, host: 'http://localhost:'+port });
    });
  });
}


