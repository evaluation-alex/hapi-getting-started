'use strict';
import {locale} from './../utils';
export let register = function register(server, options, next) {
    server.ext('onPreResponse', (request, reply) => {
        const response = request.response;
        if (response.canMakeBoomError) {
            return reply(response.i18nError(locale(request)));
        }
        return reply.continue();
    });
    return next();
};
register.attributes = {
    name: 'i18n'
};
