'use strict';
var _ = require('lodash');
var Promise = require('bluebird');

module.exports = function ValidAndPermitted () {
    return {
        isValid: function isValid (id, member, roles) {
            var self = this;
            if (member === 'root') {
                return Promise.resolve({message: 'valid'});
            } else {
                return self._findOne({_id: id})
                    .then(function (g) {
                        var message = '';
                        if (!g) {
                            message = 'not found';
                        } else {
                            var isValid = !!_.find(roles, function (role) {
                                return g._isMemberOf(role, member);
                            });
                            message = isValid ? 'valid' : 'not a member of ' + JSON.stringify(roles) + ' list';
                        }
                        return {message: message};
                    });
            }
        }
    };
};
