'use strict';
let _ = require('lodash');
let traverse = require('traverse');
let utils = require('./../utils');
let SetMethods = require('./properties');
let ArrMethods = require('./add-remove');
module.exports = function Update(properties, lists, updateMethodName) {
    let ret = {};
    _.extend(ret, new SetMethods(properties));
    if (utils.hasItems(lists)) {
        _.extend(ret, new ArrMethods(lists));
    }
    const props = _.map(properties, (p) => {
        return {
            path: p.split('.'),
            method: 'set' + p.split('.').map(_.capitalize).join('')
        };
    });
    const arrs = _.map(lists, (l) => {
        let name = l.split('.').map(_.capitalize).join('');
        let pathadd = l.split('.');
        pathadd[pathadd.length - 1] = 'added' + _.capitalize(pathadd[pathadd.length - 1]);
        let pathrem = l.split('.');
        pathrem[pathrem.length - 1] = 'removed' + _.capitalize(pathrem[pathrem.length - 1]);
        return {
            added: pathadd,
            addMethod: 'add' + name,
            removed: pathrem,
            removeMethod: 'remove' + name
        };
    });
    updateMethodName = updateMethodName || 'update';
    ret[updateMethodName] = (doc, by) => {
        let self = this;
        _.forEach(props, (p) => {
            let u = traverse(doc.payload).get(p.path);
            if (!_.isUndefined(u)) {
                self[p.method](u, by);
            }
        });
        _.forEach(arrs, (arr) => {
            let ur = traverse(doc.payload).get(arr.removed);
            if (!_.isUndefined(ur) && utils.hasItems(ur)) {
                self[arr.removeMethod](ur, by);
            }
            let ua = traverse(doc.payload).get(arr.added);
            if (!_.isUndefined(ua) && utils.hasItems(ua)) {
                self[arr.addMethod](ua, by);
            }
        });
        return self;
    };
    return ret;
};
