'use strict';
let _ = require('lodash');
let traverse = require('traverse');
let utils = require('./../utils');
module.exports = function CommonMixinAddRemove (roles) {
    let rp = {};
    _.forEach(roles, function (role) {
        rp[role] = role.split('.');
    });
    return {
        isMemberOf: function isMemberOf (role, email) {
            let self = this;
            return !!_.findWhere(traverse(self).get(rp[role]), email);
        },
        add: function add (toAdd, role, by) {
            let self = this;
            let list = traverse(self).get(rp[role]);
            _.forEach(toAdd, function (memberToAdd) {
                let found = _.findWhere(list, memberToAdd);
                if (!found) {
                    list.push(memberToAdd);
                    self.trackChanges('add ' + role, null, memberToAdd, by);
                }
            });
            return self;
        },
        remove: function remove (toRemove, role, by) {
            let self = this;
            let list = traverse(self).get(rp[role]);
            _.forEach(toRemove, function (memberToRemove) {
                let found = _.remove(list, function (m) {
                    return m === memberToRemove;
                });
                if (utils.hasItems(found)) {
                    self.trackChanges('remove ' + role, memberToRemove, null, by);
                }
            });
            return self;
        }
    };
};
