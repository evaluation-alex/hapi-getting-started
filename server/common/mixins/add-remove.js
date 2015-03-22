'use strict';
var _ = require('lodash');
var traverse = require('traverse');

module.exports = function CommonMixinAddRemove (roles) {
    return {
        _isMemberOf: function isMemberOf (role, email) {
            var self = this;
            return !!_.findWhere(traverse(self).get(role.split('.')), email);
        },
        _findRoles: function findRoles (role) {
            var ret = _.findWhere(roles, role);
            return ret ? ret.split('.') : undefined;
        },
        add: function add (toAdd, role, by) {
            var self = this;
            var path = self._findRoles(role);
            if (path) {
                var list = traverse(self).get(path);
                _.forEach(toAdd, function (memberToAdd) {
                    var found = _.findWhere(list, memberToAdd);
                    if (!found) {
                        list.push(memberToAdd);
                        self._audit('add ' + role, null, memberToAdd, by);
                    }
                });
            }
            return self;
        },
        remove: function remove (toRemove, role, by) {
            var self = this;
            var path = self._findRoles(role);
            if (path) {
                var list = traverse(self).get(path);
                _.forEach(toRemove, function (memberToRemove) {
                    var found = _.remove(list, function (m) {
                        return m === memberToRemove;
                    });
                    if (found.length > 0) {
                        self._audit('remove ' + role, memberToRemove, null, by);
                    }
                });
            }
            return self;
        }
    };
};

