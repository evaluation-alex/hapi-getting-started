'use strict';
let utils = require('./../utils');
let _ = require('lodash');
module.exports.register = (server, options, next) => {
    server.ext('onPreResponse', (request, reply) => {
        const locale = utils.locale(request);
        let response = request.response;
        if (response.canMakeBoomError) {
            return reply(response.i18nError(locale));
        }
        if (response.source) {
            if (response.source.i18n) {
                response.source.i18n(locale);
            } else if (utils.hasItems(response.source.data) && response.source.data[0].i18n) {
                _.forEach(response.source.data, (d) => d.i18n(locale));
            }
        }
        return reply.continue();
    });
    return next();
};
module.exports.register.attributes = {
    name: 'i18n'
};
