'use strict';
var _ = require('lodash');

module.exports = function ValidAndPermitted () {
    return {
        isValid: function isValid (id, member, roles) {
            var self = this;
            return self._findOne({_id: id})
                .then(function (g) {
                    if (!g) {
                        return {message: 'not found'};
                    } else {
                        if (member === 'root' ||
                            !!_.find(roles, function (role) {
                                return g._isMemberOf(role, member);
                            })
                        ) {
                            return {message: 'valid', obj: g};
                        }
                        return {message: 'not a member of list'};
                    }
                });
        }
    };
};
