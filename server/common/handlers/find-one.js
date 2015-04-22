'use strict';
let Bluebird = require('bluebird');
let utils = require('./../utils');
module.exports = (Model, findOneCb) => {
    let findOneHook = Bluebird.method((output, user) => findOneCb ? findOneCb(output, user) : output);
    return (request, reply) => {
        findOneHook(request.pre[Model.collection], utils.user(request))
            .then(reply)
            .catch((err) => utils.logAndBoom(err, reply));
    };
};
