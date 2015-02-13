'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');
var _ = require('lodash');
var logger = require('./../manifest').logger;

var ExtendedModel = BaseModel.extend({
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

ExtendedModel._findByIdAndRemove = function (id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var collection = BaseModel.db.collection(self._collection);
        collection.findAndRemove({ _id: id }, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                if (!doc) {
                    reject(new Error ('document not found'));
                } else {
                    resolve(doc);
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

var CommonMixinAddRemove = function (roles) {
    return {
        _find: function (role, toFind) {
            var self = this;
            return _.findWhere(self[role], toFind);
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

module.exports.AddRemove = CommonMixinAddRemove;

var CommonMixinIsActive = {
    setActive: function (isActive, by) {
        var self = this;
        if (!(isActive === null || isActive === undefined)) {
            return isActive ? self.reactivate(by) : self.deactivate(by);
        }
        return self;
    },
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
        if (newDesc && self.description !== newDesc) {
            self._audit('change desc', self.description, newDesc, by);
            self.description = newDesc;
        }
        return self;
    }
};

module.exports.Description = CommonMixinDescription;

var CommonMixinSave = function (Model, Audit) {
    return {
        _logFn: function (start, end) {
            var self = this;
            logger.info({
                collection: Model._collection,
                id: self._id.toString(),
                start: start,
                end: end,
                elapsed: end - start
            });
            return self;
        },
        _saveAudit: function () {
            var self = this;
            return new Promise(function (resolve, reject) {
                if (self.audit && self.audit.length > 0) {
                    Promise.settle(_.map(self.audit, function (a) {
                        return Audit._insert(a, []);
                    }))
                        .then(function (saves) {
                            self.audit = [];
                            resolve(self);
                        });
                } else {
                    resolve(self);
                }
            });
        },
        _save: function () {
            var self = this;
            return new Promise(function (resolve, reject) {
                var start = Date.now();
                self._saveAudit()
                    .then(function () {
                        resolve(Model._findByIdAndUpdate(self._id, self));
                        self._logFn(start, Date.now());
                    })
                    .catch(function (err) {
                        if (err) {
                            reject(err);
                            self._logFn(start, Date.now());
                        }
                    })
                    .done();
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
            self.audit.push({
                objectChangedType: type,
                objectChangedId: self[idToUse],
                action: action,
                origValues: oldValues,
                newValues: newValues,
                by: by,
                timestamp: new Date()
            });
            self.updatedBy = by;
            self.updatedOn = new Date();
            return self;
        }
    };
};

module.exports.Audit = CommonMixinAudit;
