'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var ObjectAssign = require('object-assign');
var Promise = require('bluebird');
var _ = require('lodash');

var ExtendedModel = BaseModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

ExtendedModel._find = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.find(conditions, function (err, res) {
            if (err) {
                reject(err);
            } else {
                if (!res) {
                    reject(new Error('docs not found for conditions - ' + JSON.stringify(conditions)));
                } else {
                    resolve(res);
                }
            }
        });
    });
};

ExtendedModel._findOne = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findOne(conditions, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(doc);
            }
        });
    });
};

ExtendedModel._findByIdAndUpdate = function (id, obj) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findByIdAndUpdate(id, obj, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(obj);
            }
        });
    });
};

ExtendedModel._count = function (query) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.count(query, function (err, count) {
            if (err) {
                reject(err);
            } else {
                resolve(count);
            }
        });
    });
};

ExtendedModel._insert = function (document, notCreated) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.insert(document, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                if (!docs) {
                    resolve(notCreated);
                } else {
                    resolve(docs[0]);
                }
            }
        });
    });
};

ExtendedModel.areValid = function (property, toCheck) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!toCheck || toCheck.length === 0) {
            resolve({});
        } else {
            var conditions = {};
            conditions[property] = {$in: toCheck};
            conditions.isActive = true;
            self._find(conditions)
                .then(function (docs) {
                    if (!docs) {
                        resolve({});
                    } else {
                        var results = Object.create(null);
                        _.forEach(docs, function (doc) {
                            results[doc[property]] = true;
                        });
                        _.forEach(toCheck, function (e) {
                            if (!results[e]) {
                                results[e] = false;
                            }
                        });
                        resolve(results);
                    }
                })
                .catch(function (err) {
                    if (err) {
                        reject(err);
                    }
                });
        }
    });
};

module.exports.ExtendedModel = ExtendedModel;

var CommonMixinAddRemove = {
    _find: function (role, toFind) {
        var self = this;
        return _.findWhere(self[role], toFind);
    },
    _add: function (toAdd, role, by) {
        var self = this;
        var modified = false;
        _.forEach(toAdd, function (memberToAdd) {
            var found = self._find(role, memberToAdd);
            if (!found) {
                modified = true;
                self[role].push(memberToAdd);
                self._audit('add ' + role, null, memberToAdd, by);
            }
        });
        return modified;
    },
    _remove: function (toRemove, role, by) {
        var self = this;
        var modified = false;
        _.forEach(toRemove, function (memberToRemove) {
            var found = _.remove(self[role], function (m) {
                return m === memberToRemove;
            });
            if (found && found.length > 0) {
                modified = true;
                self._audit('remove ' + role, memberToRemove, null, by);
            }
        });
        return modified;
    }
};

module.exports.AddRemove = CommonMixinAddRemove;

var CommonMixinIsActive = {
    deactivate: function (by) {
        var self = this;
        if (self.isActive) {
            self._audit('isActive', true, false, by);
            self.isActive = false;
        }
        return self;
    },
    reactivate: function (by) {
        var self = this;
        if (!self.isActive) {
            self._audit('isActive', false, true, by);
            self.isActive = true;
        }
        return self;
    }
};

module.exports.IsActive = CommonMixinIsActive;

var CommonMixinDescription = {
    updateDesc: function (newDesc, by) {
        var self = this;
        if (self.description !== newDesc) {
            self._audit('change desc', self.description, newDesc, by);
            self.description = newDesc;
        }
        return self;
    }
};

module.exports.Description = CommonMixinDescription;

var CommonMixinSave = function (Model, Audit) {
    return {
        _save: function () {
            var self = this;
            return new Promise(function (resolve, reject) {
                var timestamp = new Date();
                if (self.audit && self.audit.length > 0) {
                    Promise.all(_.map(self.audit, function (a) {
                        a.timestamp = timestamp;
                        return Audit._insert(a, []);
                    }))
                        .then(function () {
                            self.audit = [];
                            delete self.audit;
                            resolve(Model._findByIdAndUpdate(self._id, self));
                        })
                        .done();
                } else {
                    resolve(Model._findByIdAndUpdate(self._id, self));
                }
            });
        }
    };
};

module.exports.Save = CommonMixinSave;

var CommonMixinAudit = function (type, idToUse) {
    return {
        _audit: function (action, oldValues, newValues, by) {
            var self = this;
            if (!self.audit) {
                self.audit = [];
            }
            self.audit.push({objectChangedType: type, objectChangedId: self[idToUse], action: action, origValues: oldValues, newValues: newValues, by: by});
            return self;
        }
    };
};

module.exports.Audit = CommonMixinAudit;
