'use strict';

const Routing = require('./my_router.js');

// let r = new Routing({
//   handler_error: async function (ctx, req, res, error) {
//     console.log('HANDLER_ERROR: ', error);
//   },
//   not_found: async function (ctx, req, res, error) {
//     console.log(`Not found route for url ${req.method} ${req.url}`);
//   }
// });

// var middlewares = [
//   async function (ctx, req, res) {
//     console.log('CALL MIDDLEWARE');
//     return true;
//   }
// ];

// r.use(async function (ctx, req, res) {
//   console.log('CALL GLOBAL MIDDLEWARE');
//   return true;
// });

// r.get('/adm/api/exp', middlewares, function (ctx) {
//   console.log('GET /adm/api/exp', ctx.params);
// });

// r.get('/adm/api/exp/:poll_id', [], function (ctx) {
//   console.log('GET /adm/api/exp/:poll_id', ctx.params);
// });

// r.post('/adm/api/exp', [], function (ctx) {
//   console.log('POST /adm/api/exp', ctx.params);
// });

// r.put('/adm/api/exp/:poll_id', [], function (ctx) {
//   console.log('PUT /adm/api/exp/:poll_id', ctx.params);
// });

// r.delete({ validator: { params: { poll_id: new Number_param } } }, '/adm/api/exp/:poll_id', [], function (ctx) {
//   console.log('DELETE /adm/api/exp/:poll_id', ctx.params);
// });


// function get_router_answer() {
//   var r = new Routing();
//   r.get('/', [], function (ctx) {
//     console.log(`${ctx.req.method} ${ctx.req.url}`, ctx.params);
//   });

//   r.get('/:answer_id', [], function (ctx) {
//     console.log(`${ctx.req.method} ${ctx.req.url}`, ctx.params);
//   });

//   r.post('/', function (ctx) {
//     console.log(`${ctx.req.method} ${ctx.req.url}`, ctx.params);
//   });

//   r.put('/:answer_id', function (ctx) {
//     console.log(`${ctx.req.method} ${ctx.req.url}`, ctx.params);
//   });

//   r.delete('/:answer_id', function (ctx) {
//     console.log(`${ctx.req.method} ${ctx.req.url}`, ctx.params);
//   });

//   r.get('/:answer_id/file1/file2', [async function () {
//     console.log('CALL BEFORE FILE');
//     return true;
//   }], function (ctx) {
//     console.log(`${ctx.req.method} ${ctx.req.url}`, ctx.params);
//   });
//   // console.dir(r._methods.get, { depth: 20, colors: true });global.process.exit();
//   return r;
// }

// var router_answer = get_router_answer();
// r.use('/adm/api/exp/:poll_id/answer', [async function () {
//   console.log('MIDDLEWARE FOR ANSWER\n\n\n');
//   return true;
// }], router_answer);


test('Example', async (done) => {
  let r = create_router();

  var middlewares = [
    async function (ctx) {
      console.log('CALL MIDDLEWARE');
      expect(ctx.req.url).toBe('/adm/api/exp');
      return true;
    }
  ];

  r.use(async function (ctx) {
    console.log('CALL GLOBAL MIDDLEWARE');
    expect(ctx.req.url).toBe('/adm/api/exp');
    return true;
  });

  r.get('/adm/api/exp', middlewares, function (ctx) {
    console.log('GET /adm/api/exp', ctx.params);
    expect(ctx.req.url).toBe('/adm/api/exp');
    done();
  });

  await r.lookup({ method: 'GET', url: '/adm/api/exp' }, {});
});



function create_router() {
  return new Routing({
    handler_error: async function(ctx, req, res, error) {
      console.log('HANDLER_ERROR: ', error);
    },
    not_found: async function(ctx, req, res, error) {
      console.log(`Not found route for url ${req.method} ${req.url}`);
    }
  });
}


// void async function() {
  // await r.lookup({ method: 'GET', url: '/adm/api/exp' }, {});
  // await r.lookup({ method: 'GET', url: '/adm/api/exp/1' }, {});
  // await r.lookup({ method: 'POST', url: '/adm/api/exp' }, {});
  // await r.lookup({ method: 'PUT', url: '/adm/api/exp/1' }, {});
  // await r.lookup({ method: 'DELETE', url: '/adm/api/exp/1' }, {});

  // await r.lookup({ method: 'GET', url: '/adm/api/exp/1/answer' }, {});
  // await r.lookup({ method: 'GET', url: '/adm/api/exp/1/answer/1' }, {});
  // await r.lookup({ method: 'POST', url: '/adm/api/exp/1/answer' }, {});
  // await r.lookup({ method: 'PUT', url: '/adm/api/exp/1/answer/1' }, {});
  // await r.lookup({ method: 'DELETE', url: '/adm/api/exp/1/answer/1' }, {});

  // await r.lookup({ method: 'GET', url: '/adm/api/exp/1/answer/adada/file1/file2' }, {});
// }();


// console.dir(r._methods.delete._head, { depth: 20, colors: true }); global.process.exit();




// const myObj = {
//   doSomething() {
//     console.log('does something');
//   }
// };

// test('spyOn .toBeCalled()', () => {
//   const somethingSpy = jest.spyOn(myObj, 'doSomething');
//   myObj.doSomething();
//   expect(somethingSpy).toBeCalled();
// });