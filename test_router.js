'use strict';

const http = require('http');
const router = require('find-my-way')();
console.log(router);
router.on('GET', '/', async (req, res, params) => {
  console.log(req);
  var data = await new Promise((resolve) => {
    setTimeout(() => resolve({ message: 'Hello world!' }), 2000);
  });
  res.end(JSON.stringify(data));
});

router.on('GET', '/example/:userId', (req, res, params) => {
  res.end('userId\n');
});

router.on('GET', '/example/:userId/p1', (req, res, params) => {
  res.end('userId2\n');
});

router.on('GET', '/example/:userId/p2', (req, res, params) => {
  res.end('userId2\n');
});

router.on('GET', '/example/abc', (req, res, params) => {
  res.end('abc\n');
});

const server = http.createServer((req, res) => {
  router.lookup(req, res);
});

server.listen(3000, err => {
  if (err) {
    return console.log(err);
  }
  console.log('Server listening on: http://localhost:3000');
});