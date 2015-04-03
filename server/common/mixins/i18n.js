'use strict';
let _ = require('lodash');
let ___ = require('./../../../config').i18n;
module.exports = function I18N(fields) {
    return {
        i18n: (locale) => {
            let self = this;
            _.forEach(fields, (field) => {
                if (_.isArray(self[field]) && self[field].length === 2) {
                    self[field] = ___.__({phrase: self[field][0], locale: locale}, self[field][1]);
                }
            });
            return self;
        }
    };
};
