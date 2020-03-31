'use strict';


const router_type = module.exports;


router_type.Validator = class Validator {
  constructor() {}
};


router_type.Num = class Num extends router_type.Validator {
  constructor() {
    super();
    this._how_validate = new RegExp('^\\d+$');
  }

  validate(value) {
    return this._how_validate.test(value);
  }

  parse(val) {
    return parseInt(val, 10);
  }
};


router_type.num = new router_type.Num();


