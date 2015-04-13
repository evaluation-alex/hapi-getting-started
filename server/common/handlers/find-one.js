'use strict';
var Promise = require('bluebird');
let utils = require('./../utils');
module.exports = function FindOneHandler (Model, findOneCb) {
    /*jshint unused:false*/
    let findOneHook = (output, user) => new Promise((resolve, reject) =>
            resolve(findOneCb ?
                    findOneCb(output, user) :
                    output
            )
    );
    /*jshint unused:true*/
    return (request, reply) => {
        findOneHook(request.pre[Model.collection], request.auth.credentials.user)
            .then(reply)
            .catch((err) => utils.logAndBoom(err, reply));
    };
};
