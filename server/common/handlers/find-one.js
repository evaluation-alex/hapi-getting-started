'use strict';
var Promise = require('bluebird');
let utils = require('./../utils');
module.exports = function FindOneHandler (Model, findOneCb) {
    /*jshint unused:false*/
    let findOneHook = (output) => new Promise((resolve, reject) =>
            resolve(findOneCb ?
                    findOneCb(output) :
                    output
            )
    );
    /*jshint unused:true*/
    return (request, reply) => {
        findOneHook(request.pre[Model.collection])
            .then(reply)
            .catch((err) => utils.logAndBoom(err, reply));
    };
};
