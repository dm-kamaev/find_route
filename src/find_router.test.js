'use strict';

const http = require('http');
const axios = require('axios');
const get_port = require('get-port');

const Find_router = require('./Find_router.js');


describe('Find router v1', function() {
  let r;
  beforeAll(function () {
    r = new Find_router({
      error: async function (ctx, reply, error) {
        reply.status(500).send('INTERNAL ERROR');
      },
      not_found: async function (ctx, reply) {
        reply.status(404).send('NOT FOUND');
      },
      after_all: function (ctx, reply) {
        // console.log('AFTER ALL', reply.get_status_code(), reply.get_headers(), reply.get_body());
      }
    });

    const local_middleware = async function (ctx, reply) { return true; };

    r.use(async function (ctx, reply) {
      return true;
    });

    r.get('/adm/api/exp', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp');
    });

    r.get('/adm/api/exp/:poll_id', function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
    });

    r.post('/adm/api/exp', function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp');
    });

    r.put('/adm/api/exp/:poll_id', function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
    });

    r.delete('/adm/api/exp/:poll_id', function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
    });


    r.post('/adm/api/exp/throw', async function () {
      throw new Error('test error');
    });


    function get_router_answer() {
      var r = new Find_router();
      r.get('/', function (ctx, reply) {
        reply.send(ctx.get('req').method+' '+ctx.get('req').url);
      });

      r.get('/:answer_id', function (ctx, reply) {
        reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
      });

      r.post('/', function (ctx, reply) {
        reply.send(ctx.get('req').method+' '+ctx.get('req').url);
      });

      r.put('/:answer_id', function (ctx, reply) {
        reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
      });

      r.delete('/:answer_id', function (ctx, reply) {
        reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
      });

      r.get('/:answer_id/file1/file2', async function () {
        return true;
      }, function (ctx, reply) {
        reply.send(ctx.get('req').method+' '+ctx.get('req').url);
      });
      return r;
    }

    var router_answer = get_router_answer();
    r.use('/adm/api/exp/:poll_id/answer', async function () {
      return true;
    }, router_answer);

  });

  test('routing', async function () {
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
    // console.log(r._methods.get._head._child['adm']._child['api']._child['exp']._child[':poll_id']);
    // throw new Error('STOP');

    for await (var el of list) {
      let { status, data } = await req[el.method.toLowerCase()](el.url);
      expect(status).toBe(200);
      expect(data).toBe(el.method+' '+el.url);
    }

    let status, data;

    ({ status, data } = await req.get('/adm/api/exp/1/answer/aadad/file1/file2/asdsadsa'));
    expect(status).toBe(404);
    expect(data).toBe('NOT FOUND');

    ({ status, data } = await req.get('/adm/api/exp/1/answer/1aadsadadad/not_found'));
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
});



describe('Find router v1', function() {
  let r;
  let mock

  beforeAll(function () {
    mock = jest.fn(async (ctx, req, res) => {
      expect(ctx).toHaveProperty('get');
      expect(ctx).toHaveProperty('set');

      expect(req).toHaveProperty('method');
      expect(req).toHaveProperty('url');

      expect(res).toHaveProperty('socket');
      expect(res).toHaveProperty('end');

      return true;
    });

    r = new Find_router();
    r.use(mock);

    r.get('/', mock, async function(ctx, reply) {
      expect(ctx.get('url_object')).toMatchObject({
        pathname: expect.any(String),
        query: expect.any(Object)
      });

      const { 'page[num]': num, 'page[size]': size } = ctx.get('query');
      expect(num).toBe('2');
      expect(size).toBe('10');

      reply.status(200).send(ctx.get('req').method+' '+ctx.get('req').url);
    });

    r.use('/answer', mock, get_router_answer());


    function get_router_answer() {
      var r = new Find_router();

      r.get('/:answer_id', function (ctx, reply) {
        reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
      });

      return r;
    }
  });

  test('props in ctx', async function() {
    const { server, host } = await create_server(r);
    const req = axios.create({ baseURL: host });

    expect.assertions(28);

    await req.get('/?page[num]=2&page[size]=10');
    await req.get('/answer/1');

    expect(mock).toHaveBeenCalledTimes(4);

    server.close();
  });
});


describe('Find router v1', function() {
  let r;
  let counter_call;
  beforeAll(function () {

    counter_call = jest.fn();

    r = new Find_router({
      error: async function (ctx, reply, error) {
        reply.status(500).send('INTERNAL ERROR');
      },
      not_found: async function (ctx, reply) {
        reply.status(404).send('NOT FOUND');
      },
    });

    const local_middleware = async function(ctx, reply) {
      counter_call();
      return true;
    };

    const local_middleware2 = async function(ctx, reply) {
      counter_call();
      return true;
    };

    r.use(async function (ctx, reply) {
      counter_call();
      return true;
    });

    r.get('/adm/api/exp', local_middleware, local_middleware2, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp');
    });

    r.get('/adm/api/exp/:poll_id', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/1');
    });

    r.post('/adm/api/exp', local_middleware, local_middleware2, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp');
    });

    r.put('/adm/api/exp/:poll_id', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
    });

    r.delete('/adm/api/exp/:poll_id', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
    });

    function get_router_answer() {
      var r = new Find_router();
      r.get('/', function (ctx, reply) {
        reply.send(ctx.get('req').method+' '+ctx.get('req').url);
      });

      r.get('/:answer_id', function (ctx, reply) {
        reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
      });

      r.post('/', function (ctx, reply) {
        reply.send(ctx.get('req').method+' '+ctx.get('req').url);
      });

      r.put('/:answer_id', function (ctx, reply) {
        reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
      });

      r.delete('/:answer_id', function (ctx, reply) {
        reply.send(ctx.get('req').method+' /adm/api/exp/1/answer/'+ctx.get('params').answer_id);
      });

      r.get('/:answer_id/file1/file2', async function () { counter_call(); return true; }, function (ctx, reply) {
        reply.send(ctx.get('req').method+' '+ctx.get('req').url);
      });

      return r;
    }

    var router_answer = get_router_answer();
    r.use('/adm/api/exp/:poll_id/answer', async function () {
      counter_call();
      return true;
    }, router_answer);

  });

  test('middlewares', async function () {
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
      const { status, data } = await req[el.method.toLowerCase()](el.url);
      expect(status).toBe(200);
      expect(data).toBe(el.method+' '+el.url);
    }

    expect(counter_call).toHaveBeenCalledTimes(25);

    server.close();
  });
});


describe('Find router v1', function() {
  let r;
  let local_middleware;
  let global_middleware;
  beforeAll(function () {

    r = new Find_router({
      error: async function (ctx, reply, error) {
        reply.status(500).send('INTERNAL ERROR');
      },
      not_found: async function (ctx, reply) {
        reply.status(404).send('NOT FOUND');
      },
      after_all: function (ctx, reply) {
        // console.log('====', reply.get_status_code(), '====', ctx.get('req').url, ctx.get('req').method);
        expect(reply.get_status_code()).toBe(200);
        expect(reply.get_headers()['Content-type']).toBe('text/html; charset=UTF-8');
        expect(reply.get_body()).toEqual(expect.any(String));
      }
    });

    global_middleware = jest.fn(async function (ctx, reply) { return true; });
    local_middleware = jest.fn(async function (ctx, reply) { return true; });

    r.use(global_middleware);


    r.get('/adm/api/exp', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp');
    });

    r.get('/adm/api/exp/:poll_id', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/1');
    });

    r.post('/adm/api/exp', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp');
    });

    r.put('/adm/api/exp/:poll_id', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
    });

    r.delete('/adm/api/exp/:poll_id', local_middleware, function (ctx, reply) {
      reply.send(ctx.get('req').method+' /adm/api/exp/'+ctx.get('params').poll_id);
    });

  });

  test('afterAll', async function () {
    let { server, host } = await create_server(r);

    const req = axios.create({ baseURL: host  });

    let list = [
      { method: 'GET', url: '/adm/api/exp', },
      { method: 'GET', url: '/adm/api/exp/1', },
      { method: 'POST', url: '/adm/api/exp', },
      { method: 'PUT', url: '/adm/api/exp/1', },
      { method: 'DELETE', url: '/adm/api/exp/1', },
    ];


    for await (var el of list) {
      const { status, data } = await req[el.method.toLowerCase()](el.url);
    }
    // expect.assertions(17);

    expect(global_middleware).toHaveBeenCalledTimes(5);
    expect(local_middleware).toHaveBeenCalledTimes(5);

    server.close();
  });
});


describe('Find router v1', function() {
  let r;
  let local_middleware;
  beforeAll(function () {

    r = new Find_router({
      error: async function (ctx, reply, error) {
        reply.status(500).send('INTERNAL ERROR');
      },
      not_found: async function (ctx, reply) {
        reply.status(404).send('NOT FOUND');
      },
      after_all: function (ctx, reply) {
        // console.log('====', reply.get_status_code(), '====', ctx.get('req').url, ctx.get('req').method);
        expect(reply.get_status_code()).toBe(200);
        expect(reply.get_headers()['Content-type']).toBe('text/html; charset=UTF-8');
        expect(reply.get_body()).toEqual(expect.any(String));
      }
    });

    local_middleware = jest.fn(async function (ctx, reply) { return true; });

    r.get('/', local_middleware, function (ctx, reply) {
      reply.send('Variant 1');
    });

    const get_subroute = function() {
      const r = new Find_router();

      r.get('/', local_middleware, function (ctx, reply) {
        reply.send('Variant 2');
      });

      r.get('/test', function(ctx, reply) {
        reply.send(ctx.get('req').url);
      });
      return r;
    };

    r.use('/', get_subroute());

  });

  test('use with "/" with subroute', async function () {
    let { server, host } = await create_server(r);

    const req = axios.create({ baseURL: host  });

    let list = [
      { method: 'GET', url: '/', },
      { method: 'GET', url: '/test', },
    ];

    {
      const { status, data } = await req.get('/');
      expect(status).toBe(200);
      expect(data).toBe('Variant 2');
    }

    {
      const { status, data } = await req.get('/test');
      expect(status).toBe(200);
      expect(data).toBe('/test');
    }

    expect(local_middleware).toHaveBeenCalledTimes(1);

    server.close();
  });
});


// describe('Find router v1', function() {
//   let r;

//   test('duplicate router', async function () {
//     let r = new Find_router({
//       error: async function (ctx, reply, error) {
//         reply.status(500).send('INTERNAL ERROR');
//       },
//       not_found: async function (ctx, reply) {
//         reply.status(404).send('NOT FOUND');
//       },
//       after_all: function (ctx, reply) {
//         // console.log('====', reply.get_status_code(), '====', ctx.get('req').url, ctx.get('req').method);
//         expect(reply.get_status_code()).toBe(200);
//         expect(reply.get_headers()['Content-type']).toBe('text/html; charset=UTF-8');
//         expect(reply.get_body()).toEqual(expect.any(String));
//       }
//     });



//     const local_middleware = async function (ctx, reply) { return true; };

//     function init() {
//       r.get('/answer', local_middleware, function (ctx, reply) {
//         reply.send('Variant 1');
//       });

//       r.post('/answer', local_middleware, function (ctx, reply) {
//         reply.send('Variant 1');
//       });

//       r.get('/answer', local_middleware, function (ctx, reply) {
//         reply.send('Variant 1');
//       });
//     };

//     expect(init).toThrow(Error);

//   });


//   test('duplicate router(subroute)', async function () {
//     let r = new Find_router({
//       error: async function (ctx, reply, error) {
//         reply.status(500).send('INTERNAL ERROR');
//       },
//       not_found: async function (ctx, reply) {
//         reply.status(404).send('NOT FOUND');
//       },
//       after_all: function (ctx, reply) {
//         // console.log('====', reply.get_status_code(), '====', ctx.get('req').url, ctx.get('req').method);
//         expect(reply.get_status_code()).toBe(200);
//         expect(reply.get_headers()['Content-type']).toBe('text/html; charset=UTF-8');
//         expect(reply.get_body()).toEqual(expect.any(String));
//       }
//     });

//     const local_middleware = async function (ctx, reply) { return true; };

//     function init() {
//       r.get('/answer', local_middleware, function (ctx, reply) {
//         reply.send('Variant 1');
//       });

//       const get_subroute = function() {
//         const r = new Find_router();

//         r.get('/', local_middleware, function (ctx, reply) {
//           reply.send('Variant 2');
//         });

//         r.get('/test', function(ctx, reply) {
//           reply.send(ctx.get('req').url);
//         });
//         return r;
//       };

//       r.use('/answer', get_subroute());
//     }

//     expect(init).toThrow(Error);

//   });
// });


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
      // console.log('Server listening on: http://localhost:3000');
      resolve({ server, host: 'http://localhost:'+port });
    });
  });
}


