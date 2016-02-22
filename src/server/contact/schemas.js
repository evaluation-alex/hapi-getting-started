'use strict';
const Joi = require('joi');
const shared = require('./../../shared/contact/validation')(Joi);
module.exports = {
    controller: shared.controller
};
