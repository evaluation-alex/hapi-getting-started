'use strict';
let _ = require('lodash');
let traverse = require('traverse');
let utils = require('./../utils');
let setMethods = function setMethods (toEnrich, forProps) {
    _.forEach(forProps, (property) => {
        const path = property.split('.');
        const method = path.map(_.capitalize).join('');
        toEnrich['set' + method] = (newValue, by) => {
            let self = this;
            let origval = traverse(self).get(path);
            if (!_.isUndefined(newValue) && !_.isEqual(origval, newValue)) {
                self.trackChanges(property, origval, newValue, by);
                traverse(self).set(path, newValue);
            }
            return self;
        };
    });
    return toEnrich;
};
let addRemoveMethods = function addRemoveMethods (toEnrich, roles) {
    let rp = {};
    _.forEach(roles, (role) => {
        rp[role] = role.split('.');
        let rlpth = rp[role];
        toEnrich['isMemberOf' + role] = (email) => {
            let self = this;
            return !!_.findWhere(traverse(self).get(rlpth), email);
        };
        let methodName = _.map(rlpth, _.capitalize).join('');
        toEnrich['add' + methodName] = (toAdd, by) => {
            let self = this;
            let list = traverse(self).get(rlpth);
            _.forEach(toAdd, (memberToAdd) => {
                let found = _.findWhere(list, memberToAdd);
                if (!found) {
                    list.push(memberToAdd);
                    self.trackChanges('add ' + role, null, memberToAdd, by);
                }
            });
            return self;
        };
        toEnrich['remove' + methodName] = (toRemove, by) => {
            let self = this;
            let list = traverse(self).get(rlpth);
            _.forEach(toRemove, (memberToRemove) => {
                let found = _.remove(list, (m) => m === memberToRemove);
                if (utils.hasItems(found)) {
                    self.trackChanges('remove ' + role, memberToRemove, null, by);
                }
            });
            return self;
        };
    });
};
let updateMethod = function updateMethod(toEnrich, properties, lists, updateMethodName) {
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
    toEnrich[updateMethodName] = (doc, by) => {
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
    return toEnrich;
};

module.exports = function Update (properties, lists, updateMethodName) {
    return updateMethod(setMethods(addRemoveMethods({}, lists), properties), properties, lists, updateMethodName);
};

