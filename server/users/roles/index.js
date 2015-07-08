'use strict';
module.exports.register = (server, options, next) => {
    return next();
};
module.exports.register.attributes = {
    name: 'users/roles'
};
