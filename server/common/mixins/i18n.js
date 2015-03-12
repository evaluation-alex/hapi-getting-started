'use strict';
var _ = require('lodash');
var ___ = require('./../../../config').i18n;

module.exports = function I18N (fields) {
    return {
        i18n: function i18n (locale) {
            var self = this;
            _.forEach(fields, function (field) {
                self[field] = ___.__({phrase: self[field][0], locale: locale}, self[field][1]);
            });
            return self;
        }
    };
};
