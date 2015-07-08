'use strict';
module.exports.register = (server, options, next) => {
    server.route(require('./routes'));
    return next();
};
module.exports.register.attributes = {
    name: 'blogs/posts'
};
