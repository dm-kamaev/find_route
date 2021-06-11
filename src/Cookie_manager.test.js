'use strict';

const Cookie_manager = require('./Cookie_manager.js');


describe('Cookie_manager', function() {

  test('set one', async function () {
    const cm = new Cookie_manager();
    cm.set({ name: 'us_name', value: 'John', days_to_live: 4, domain: 'test.ru' });
    expect(cm.get_all_with_header()).toBe('Set-Cookie: us_name=John; max-age=345600; path=/; domain=test.ru;\r\n');
  });

  test('set list', async function () {
    const cm = new Cookie_manager();
    cm.set([{ name: 'A', value: 'John', days_to_live: 4, domain: 'test.ru' }, { name: 'B', value: 'Carter', days_to_live: 24, domain: 'test.ru' }]);
    expect(cm.get_all_with_header()).toBe(
      'Set-Cookie: A=John; max-age=345600; path=/; domain=test.ru;\r\n'+
      'Set-Cookie: B=Carter; max-age=2073600; path=/; domain=test.ru;\r\n'
    );
  });

});