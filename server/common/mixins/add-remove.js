'use strict';
var _ = require('lodash');
var traverse = require('traverse');
var utils = require('./../utils');

module.exports = function CommonMixinAddRemove (roles) {
    var rp = {};
    _.forEach(roles, function (role) {
        rp[role] = role.split('.');
    });
    return {
        isMemberOf: function isMemberOf (role, email) {
            var self = this;
            return !!_.findWhere(traverse(self).get(rp[role]), email);
        },
        add: function add (toAdd, role, by) {
            var self = this;
            var list = traverse(self).get(rp[role]);
            _.forEach(toAdd, function (memberToAdd) {
                var found = _.findWhere(list, memberToAdd);
                if (!found) {
                    list.push(memberToAdd);
                    self.trackChanges('add ' + role, null, memberToAdd, by);
                }
            });
            return self;
        },
        remove: function remove (toRemove, role, by) {
            var self = this;
            var list = traverse(self).get(rp[role]);
            _.forEach(toRemove, function (memberToRemove) {
                var found = _.remove(list, function (m) {
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

