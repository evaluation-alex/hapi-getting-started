'use strict';
let _ = require('lodash');
let traverse = require('traverse');
let utils = require('./../utils');
let decorateWithSetMethods = (onObject, properties) => {
    _.forEach(properties, (property) => {
        const path = property.split('.');
        const name = path.map(_.capitalize).join('');
        onObject['set' + name] = (newValue, by) => {
            let self = this;
            let origval = traverse(self).get(path);
            if (!_.isUndefined(newValue) && !_.isEqual(origval, newValue)) {
                self.trackChanges(property, origval, newValue, by);
                traverse(self).set(path, newValue);
            }
            return self;
        };
    });
};
let decorateWithIsPresentIn = (onObject, path, methodName) => {
    onObject['isPresentIn' + methodName] = (toCheck) => {
        var self = this;
        return !!_.find(traverse(self).get(path), (o) => _.isEqual(o, toCheck));
    };
};
let decorateWithAdd = (onObject, role, path, methodName) => {
    onObject['add' + methodName] = (toAdd, by) => {
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
    onObject['remove' + methodName] = (toRemove, by) => {
        let self = this;
        let list = traverse(self).get(path);
        _.forEach(toRemove, (memberToRemove) => {
            let found = _.remove(list, (o) => _.isEqual(o, memberToRemove));
            if (utils.hasItems(found)) {
                self.trackChanges('remove ' + role, memberToRemove, null, by);
            }
        });
        return self;
    };
};
let decorateWithArrMethods = (onObject, lists) => {
    if (utils.hasItems(lists)) {
        _.forEach(lists, (role) => {
            let path = role.split('.');
            let methodName = path.map(_.capitalize).join('');
            decorateWithIsPresentIn(onObject, path, methodName);
            decorateWithAdd(onObject, role, path, methodName);
            decorateWithRemove(onObject, role, path, methodName);
        });
    }
};
let propDescriptors = (properties) => {
    return _.map(properties, (p) => {
        return {
            path: p.split('.'),
            method: 'set' + p.split('.').map(_.capitalize).join('')
        };
    });
};
let arrDescriptors = (lists) => {
    return _.map(lists, (l) => {
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
};
let decorateWithUpdate = (onObject, properties, lists, update) => {
    let props = propDescriptors(properties);
    let arrs = arrDescriptors(lists);
    onObject[update] = (doc, by) => {
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
};
let decorateWithJoinApproveRejectLeave = (onObject, toAdd, affectedRole, needsApproval) => {
    let needsApprovalMethod = needsApproval.split('.').map(_.capitalize).join('');
    let affectedRoleMethod = affectedRole.split('.').map(_.capitalize).join('');
    onObject.join = (doc, by) => {
        let self = this;
        let method = self.access === 'public' ? affectedRoleMethod : needsApprovalMethod;
        return self['add' + method]([by], by);
    };
    onObject.approve = (doc, by) => {
        let self = this;
        self['add' + affectedRoleMethod](doc.payload[toAdd], by);
        self['remove' + needsApprovalMethod](doc.payload[toAdd], by);
        return self;
    };
    onObject.reject = (doc, by) => {
        let self = this;
        return self['remove' + needsApprovalMethod](doc.payload[toAdd], by);
    };
    onObject.leave = (doc, by) => {
        let self = this;
        return self['remove' + affectedRoleMethod]([by], by);
    };
};
module.exports = function Update (properties, lists, updateMethodName, toAdd, affectedRole, needsApproval) {
    let ret = {};
    decorateWithSetMethods(ret, properties);
    decorateWithArrMethods(ret, lists);
    decorateWithUpdate(ret, properties, lists, updateMethodName);
    if (toAdd) {
        decorateWithJoinApproveRejectLeave(ret, toAdd, affectedRole, needsApproval);
    }
    return ret;
};
