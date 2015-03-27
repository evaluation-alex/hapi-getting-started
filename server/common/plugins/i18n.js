'use strict';
var utils = require('./../utils');
var _ = require('lodash');

module.exports.register = function register (server, options, next) {
    server.ext('onPreResponse', function internationalize (request, reply) {
        var locale = utils.locale(request);
        var response = request.response;
        if (response.canMakeBoomError) {
            return reply(response.i18nError(locale));
        }
        if (response.source) {
            if (response.source.i18n) {
                response.source.i18n(locale);
            } else if (utils.hasItems(response.source.data) && response.source.data[0].i18n) {
                _.forEach(response.source.data, function (d) {
                    d.i18n(locale);
                });
            }
        }
        return reply.continue();
    });
    next();
};

module.exports.register.attributes = {
    name: 'i18n'
};

