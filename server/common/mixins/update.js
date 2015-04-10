'use strict';
let _ = require('lodash');
let traverse = require('traverse');
let utils = require('./../utils');
let decorateWithSetMethods = (onObject, properties) => {
    _.forEach(properties, (p) => {
        onObject[p.method] = (newValue, by) => {
            let self = this;
            let origval = traverse(self).get(p.path);
            if (!_.isUndefined(newValue) && !_.isEqual(origval, newValue)) {
                self.trackChanges(p.name, origval, newValue, by);
                traverse(self).set(p.path, newValue);
            }
            return self;
        };
    });
};
let decorateWithIsPresentIn = (onObject, path, methodSuffix) => {
    onObject['isPresentIn' + methodSuffix] = (toCheck) => {
        var self = this;
        return !!_.find(traverse(self).get(path), (o) => _.isEqual(o, toCheck));
    };
};
let decorateWithAdd = (onObject, role, path, methodName) => {
    onObject[methodName] = (toAdd, by) => {
        let self = this;
        let list = traverse(self).get(path);
        _.forEach(toAdd, (memberToAdd) => {
            let found = _.find(list, (o) => _.isEqual(o, memberToAdd));
            if (!found) {
                list.push(memberToAdd);
                self.trackChanges('add ' + role, null, memberToAdd, by);
            }
        });
        return self;
    };
};
let decorateWithRemove = (onObject, role, path, methodName) => {
    onObject[methodName] = (toRemove, by) => {
        let self = this;
        let list = traverse(self).get(path);
        _.forEach(toRemove, (memberToRemove) => {
            let removed = _.remove(list, (o) => _.isEqual(o, memberToRemove));
            if (utils.hasItems(removed)) {
                self.trackChanges('remove ' + role, memberToRemove, null, by);
            }
        });
        return self;
    };
};
let decorateWithArrMethods = (onObject, lists) => {
    if (utils.hasItems(lists)) {
        _.forEach(lists, (role) => {
            decorateWithIsPresentIn(onObject, role.path, role.methodSuffix);
            decorateWithAdd(onObject, role.name, role.path, role.addMethod);
            decorateWithRemove(onObject, role.name, role.path, role.removeMethod);
        });
    }
};
let propDescriptors = (properties) => {
    return _.map(properties, (p) => {
        return {
            name: p,
            path: p.split('.'),
            method: 'set' + p.split('.').map(_.capitalize).join('')
        };
    });
};
let arrDescriptors = (lists) => {
    return _.map(lists, (l) => {
        let methodSuffix = l.split('.').map(_.capitalize).join('');
        let pathadd = l.split('.');
        pathadd[pathadd.length - 1] = 'added' + _.capitalize(pathadd[pathadd.length - 1]);
        let pathrem = l.split('.');
        pathrem[pathrem.length - 1] = 'removed' + _.capitalize(pathrem[pathrem.length - 1]);
        return {
            name: l,
            path: l.split('.'),
            methodSuffix: methodSuffix,
            added: pathadd,
            addMethod: 'add' + methodSuffix,
            removed: pathrem,
            removeMethod: 'remove' + methodSuffix
        };
    });
};
let decorateWithUpdate = (onObject, props, arrs, update) => {
    onObject[update] = (doc, by) => {
        let self = this;
        _.forEach(props, (p) => {
            let u = traverse(doc.payload).get(p.path);
            if (!_.isUndefined(u)) {
                self[p.method](u, by);
            }
        });
        _.forEach(arrs, (arr) => {
            let r = traverse(doc.payload).get(arr.removed);
            if (!_.isUndefined(r) && utils.hasItems(r)) {
                self[arr.removeMethod](r, by);
            }
            let a = traverse(doc.payload).get(arr.added);
            if (!_.isUndefined(a) && utils.hasItems(a)) {
                self[arr.addMethod](a, by);
            }
        });
        return self;
    };
};
let decorateWithJoinApproveRejectLeave = (onObject, affectedRole, needsApproval) => {
    let needsApprovalMethodSuffix = needsApproval.split('.').map(_.capitalize).join('');
    let affectedRoleMethodSuffix = affectedRole.split('.').map(_.capitalize).join('');
    let toAdd = affectedRole.split('.');
    toAdd[toAdd.length - 1] = 'added' + _.capitalize(toAdd[toAdd.length - 1]);
    onObject.join = (doc, by) => {
        let self = this;
        let method = self.access === 'public' ? affectedRoleMethodSuffix : needsApprovalMethodSuffix;
        return self['add' + method]([by], by);
    };
    onObject.approve = (doc, by) => {
        let self = this;
        self['add' + affectedRoleMethodSuffix](traverse(doc.payload).get(toAdd), by);
        self['remove' + needsApprovalMethodSuffix](traverse(doc.payload).get(toAdd), by);
        return self;
    };
    onObject.reject = (doc, by) => {
        let self = this;
        return self['remove' + needsApprovalMethodSuffix](traverse(doc.payload).get(toAdd), by);
    };
    onObject.leave = (doc, by) => {
        let self = this;
        return self['remove' + affectedRoleMethodSuffix]([by], by);
    };
};
module.exports = function Update (properties, lists, updateMethodName, affectedRole, needsApproval) {
    let ret = {};
    let props = propDescriptors(properties);
    let arrs = arrDescriptors(lists);
    decorateWithSetMethods(ret, props);
    decorateWithArrMethods(ret, arrs);
    decorateWithUpdate(ret, props, arrs, updateMethodName);
    if (affectedRole) {
        decorateWithJoinApproveRejectLeave(ret, affectedRole, needsApproval);
    }
    return ret;
};
