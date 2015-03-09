'use strict';
var _ = require('lodash');
var logger = require('./../../config').logger;

module.exports.AddRemove = function CommonMixinAddRemove (roles) {
    return {
        _isMemberOf: function (role, email) {
            var self = this;
            return !!_.findWhere(self[role], email);
        },
        _findRoles: function (role) {
            return _.find(_.pairs(roles), function (pair) {
                return role.indexOf(pair[0]) !== -1;
            });
        },
        add: function (toAdd, role, by) {
            var self = this;
            var rolePair = self._findRoles(role);
            if (toAdd && toAdd.length > 0 && rolePair) {
                _.forEach(toAdd, function (memberToAdd) {
                    var found = _.findWhere(self[rolePair[1]], memberToAdd);
                    if (!found) {
                        self[rolePair[1]].push(memberToAdd);
                        self._audit('add ' + role, null, memberToAdd, by);
                    }
                });
            }
            return self;
        },
        remove: function (toRemove, role, by) {
            var self = this;
            var rolePair = self._findRoles(role);
            if (toRemove && toRemove.length > 0 && rolePair) {
                _.forEach(toRemove, function (memberToRemove) {
                    var found = _.remove(self[rolePair[1]], function (m) {
                        return m === memberToRemove;
                    });
                    if (found && found.length > 0) {
                        self._audit('remove ' + role, memberToRemove, null, by);
                    }
                });
            }
            return self;
        }
    };
};

module.exports.JoinApproveReject  = function CommonMixinJoinApproveReject (property, roleToAdd, needsApproval) {
    return {
        join: function (doc, by) {
            var self = this;
            return self.add(doc.payload[property], self.access === 'public' ? roleToAdd : needsApproval, by);
        },
        approve: function (doc, by) {
            var self = this;
            return self.add(doc.payload[property], roleToAdd, by).remove(doc.payload[property], needsApproval, by);
        },
        reject: function (doc, by) {
            var self = this;
            return self.remove(doc.payload[property], needsApproval, by);
        }
    };
};

module.exports.Update = function CommonMixinUpdate (properties, lists) {
    return {
        update: function (doc, by) {
            var self = this;
            _.forIn(properties, function (value, key) {
                self['set' + _.capitalize(key)](doc.payload[value], by);
            });
            _.forIn(lists, function (value, key) {
                self.add(doc.payload['added' + _.capitalize(value)], key, by);
                self.remove(doc.payload['removed' + _.capitalize(value)], key, by);
            });
            return self;
        }
    };
};

module.exports.IsActive = {
    del: function (doc, by) {
        var self = this;
        return self.deactivate(by);
    },
    deactivate: function (by) {
        var self = this;
        return self.setIsActive(false, by);
    },
    reactivate: function (by) {
        var self = this;
        return self.setIsActive(true, by);
    }
};

module.exports.Properties = function CommonMixinProperties (properties) {
    var ret = {};
    _.forEach(properties, function (property) {
        ret['set' + _.capitalize(property)] = function (newValue, by) {
            var self = this;
            if (!_.isUndefined(newValue) && !_.isEqual(self[property], newValue)) {
                self._audit(property, self[property], newValue, by);
                self[property] = newValue;
            }
            return self;
        };
    });
    return ret;
};

module.exports.Save = function CommonMixinSave (Model, Audit) {
    return {
        _saveAudit: function () {
            var self = this;
            if (self.audit && self.audit.length > 0) {
                _.forEach(self.audit, function (a) {
                    /*jshint unused:false*/
                    Audit.insert(a, function (err, doc) {
                        if (err) {
                            logger.error({error: err});
                        }
                    });
                    /*jshint unused:true*/
                });
                self.audit = [];
            }
            return self;
        },
        save: function () {
            var self = this;
            return Model._findByIdAndUpdate(self._id, self._saveAudit());
        }
    };
};

module.exports.Audit = function CommonMixinAudit (type, idToUse) {
    return {
        _audit: function (action, oldValues, newValues, by) {
            var self = this;
            if (!self.audit) {
                self.audit = [];
            }
            self.audit.push({
                objectChangedType: type,
                objectChangedId: self[idToUse],
                action: action,
                origValues: oldValues,
                newValues: newValues,
                organisation: self.organisation,
                by: by,
                timestamp: new Date()
            });
            self.updatedBy = by;
            self.updatedOn = new Date();
            return self;
        }
    };
};

