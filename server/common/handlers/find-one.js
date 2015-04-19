'use strict';
let Bluebird = require('bluebird');
let utils = require('./../utils');
module.exports = function FindOneHandler (Model, findOneCb) {
    let findOneHook = Bluebird.method((output, user) => findOneCb ? findOneCb(output, user) : output);
    return (request, reply) => {
        findOneHook(request.pre[Model.collection], request.auth.credentials.user)
            .then(reply)
            .catch((err) => utils.logAndBoom(err, reply));
    };
};
