'use strict';
let _ = require('lodash');
let traverse = require('traverse');
module.exports = function Update(properties, lists, updateMethodName) {
    const props = _.map(properties, (p) => {
        return {
            path: p.split('.'),
            method: 'set' + p.split('.').map(_.capitalize).join('')
        };
    });
    const arrs = _.map(lists, (l) => {
        let pathadd = l.split('.');
        pathadd[pathadd.length - 1] = 'added' + _.capitalize(pathadd[pathadd.length - 1]);
        let pathrem = l.split('.');
        pathrem[pathrem.length - 1] = 'removed' + _.capitalize(pathrem[pathrem.length - 1]);
        return {
            prop: l,
            added: pathadd,
            removed: pathrem
        };
    });
    updateMethodName = updateMethodName || 'update';
    let ret = {};
    ret[updateMethodName] = (doc, by) => {
        let self = this;
        _.forEach(props, (p) => {
            let u = traverse(doc.payload).get(p.path);
            if (!_.isUndefined(u)) {
                self[p.method](u, by);
            }
        });
        _.forEach(arrs, (arr) => {
            let ua = traverse(doc.payload).get(arr.added);
            if (!_.isUndefined(ua)) {
                self.add(ua, arr.prop, by);
            }
            let ur = traverse(doc.payload).get(arr.removed);
            if (!_.isUndefined(ur)) {
                self.remove(ur, arr.prop, by);
            }
        });
        return self;
    };
    return ret;
};
