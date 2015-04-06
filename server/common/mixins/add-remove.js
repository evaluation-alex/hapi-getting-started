'use strict';
let _ = require('lodash');
let traverse = require('traverse');
let utils = require('./../utils');
module.exports = function AddRemove(roles) {
    let ret = {};
    _.forEach(roles, (role) => {
        let path = role.split('.');
        let methodName = path.map(_.capitalize).join('');
        ret['isPresentIn' + methodName] = (toCheck) => {
            var self = this;
            return !!_.find(traverse(self).get(path), (o) => _.isEqual(o, toCheck));
        };
        ret['add' + methodName] = (toAdd, by) => {
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
        ret['remove' + methodName] = (toRemove, by) => {
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
    });
    return ret;
};
