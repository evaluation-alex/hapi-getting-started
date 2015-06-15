'use strict';
module.exports.register = (server, options, next) => {
    server.route(require('./routes'));
    next();
};
module.exports.register.attributes = {
    name: 'preferences'
};
