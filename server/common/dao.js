'use strict';
const _ = require('lodash');
const Bluebird = require('bluebird');
const mongodb = require('mongodb');
const config = require('./../config');
const utils = require('./utils');
const errors = require('./errors');
const {extend, upperFirst, get, isUndefined, isEqual, set, find, remove, isArray, omit, merge, assign} = _;
const {MongoClient, ObjectID} = mongodb;
const {errback, hasItems, timing} = utils;
const {ObjectNotCreatedError} = errors;
const {i18n, logger} = config;
let connections = {};
function gatherStats(collection, method, query, start, err) {
    const elapsed = Date.now() - start;
    err = !!err;
    const fields = {elapsed, err};
    const tags = {collection, method};
    if (query) {
        fields.query = Object.keys(query).sort().join('|');
    }
    timing('dao', tags, fields);
}
function defaultcb(resolve, reject, collection, method, query) {
    const start = Date.now();
    return function cb(err, res) {
        if (err) {
            logger.error({error: err, stack: err.stack});
            reject(err);
            gatherStats(collection, method, query, start, err);
        } else {
            resolve(res);
            gatherStats(collection, method, query, start);
        }
    };
}
const connect = function connect(name, cfg) {
    return new Bluebird((resolve, reject) => {
        if (connections[name]) {
            resolve(connections[name]);
        } else {
            MongoClient.connect(cfg.url, cfg.options,
                defaultcb(db => {
                    connections[name] = db;
                    resolve(db);
                }, reject, 'db', 'connect'));
        }
    });
};
const db = function db(name) {
    return connections[name];
};
const disconnect = function disconnect(name) {
    db(name).close(false, err => {
        connections[name] = undefined;
        errback(err);
    });
};
function withSchemaProperties(Dao, connection, collection, indexes, modelSchema, schemaVersion) {
    return extend(Dao, {ObjectID, collection, indexes, connection, modelSchema, schemaVersion});
}
function withSetupMethods(Dao, nonEnumerables) {
    extend(Dao.prototype, {
        init(attrs) {
            assign(this, attrs);
            nonEnumerables.forEach(ne => {
                Object.defineProperty(this, ne, {writable: true, enumerable: false});
            });
            Object.defineProperty(this, '__isModified', {writable: true, enumerable: false});
        }
    });
    return extend(Dao, {
        clctn() {
            return db(Dao.connection).collection(Dao.collection);
        },
        createIndexes() {
            return Bluebird.all(Dao.indexes.map(index => {
                return new Bluebird((resolve, reject) => {
                    Dao.clctn().createIndex(index.fields, index.options || {}, defaultcb(resolve, reject, Dao.collection, 'createIndex'));
                });
            }));
        }
    });
}
function withModifyMethods(Dao, isReadonly, saveAudit, idForAudit = '_id') {
    extend(Dao, {
        upsert(obj) {
            const opts = {upsert: true, returnOriginal: false};
            return new Bluebird((resolve, reject) => {
                obj.objectVersion = obj.objectVersion || 0;
                obj.objectVersion++;
                obj.schemaVersion = obj.schemaVersion || Dao.schemaVersion;
                obj._id = obj._id || Dao.ObjectID();
                Dao.clctn().findOneAndReplace({_id: obj._id}, obj, opts,
                    defaultcb(doc => resolve(new Dao(doc.value)), reject, Dao.collection, 'upsert')
                );
            });
        }
    });
    /*istanbul ignore if*/
    /*istanbul ignore else*/
    if (process.env.NODE_ENV !== 'production') {
        extend(Dao, {
            remove(query) {
                return new Bluebird((resolve, reject) => {
                    Dao.clctn().deleteMany(query,
                        defaultcb(doc => resolve(doc.deletedCount), reject, Dao.collection, 'remove', query)
                    );
                });
            }
        });
    }
    if (!isReadonly) {
        extend(Dao, {
            remove(query) {
                return new Bluebird((resolve, reject) => {
                    Dao.clctn().deleteMany(query,
                        defaultcb(doc => resolve(doc.deletedCount), reject, Dao.collection, 'remove', query)
                    );
                });
            },
            saveChangeHistory(audit) {
                return new Bluebird((resolve, reject) => {
                    if (audit && saveAudit) {
                        db(Dao.connection).collection('audit').insertOne(audit, defaultcb(resolve, reject, 'audit', 'insert'));
                    } else {
                        resolve(true);
                    }
                });
            },
            insertAndAudit(doc, by) {
                const now = new Date();
                merge(doc, {isActive: true, createdBy: by, createdOn: now, updatedBy: by, updatedOn: now});
                return Dao.upsert(doc)
                    .then(obj => {
                        /*istanbul ignore if: too lazy to write this test case*/
                        if (!obj) {
                            return Bluebird.reject(new ObjectNotCreatedError({collection: Dao.collection}));
                        } else {
                            return Dao.saveChangeHistory({
                                    objectChangedType: Dao.collection,
                                    objectChangedId: obj[idForAudit],
                                    organisation: obj.organisation,
                                    by: by,
                                    on: now,
                                    change: [{action: 'create', newValues: doc}]
                                })
                                .then(() => obj);
                        }
                    });
            }
        });
    }
    return Dao;
}
function withFindMethods(Dao, areValidProperty) {
    extend(Dao, {
        count(query) {
            return new Bluebird((resolve, reject) => {
                Dao.clctn().count(query, defaultcb(resolve, reject, Dao.collection, 'count', query));
            });
        },
        find(query, fields, sort, limit, skip) {
            return new Bluebird((resolve, reject) => {
                const start = Date.now();
                let cursor = Dao.clctn().find(query, {fields, sort, limit, skip});
                let results = [];
                /*istanbul ignore next*/
                function handleError(err) {
                    errback(err);
                    gatherStats(Dao.collection, 'find', query, start, err);
                    reject(err);
                }

                function next(err, doc) {
                    /*istanbul ignore if*/
                    if (err) {
                        handleError(err);
                    } else {
                        results.push(new Dao(doc));
                        cursor.hasNext(hasNext);
                    }
                }

                function hasNext(err, hasMore) {
                    /*istanbul ignore if*/
                    if (err) {
                        handleError(err);
                    } else {
                        if (hasMore) {
                            cursor.next(next);
                        } else {
                            resolve(results);
                            gatherStats(Dao.collection, 'find', query, start, err);
                        }
                    }
                }

                cursor.hasNext(hasNext);
            });
        },
        findOne(query) {
            return new Bluebird((resolve, reject) => {
                Dao.clctn().findOne(query, {},
                    defaultcb(doc => resolve(doc ? new Dao(doc) : undefined), reject, Dao.collection, 'findOne', query)
                );
            });
        },
        pagedFind(query, fields, sort, limit, page) {
            return Bluebird.join(
                Dao.find(query, fields, sort, limit, (page - 1) * limit),
                Dao.count(query),
                (results, count) => {
                    return {
                        data: results,
                        pages: {
                            current: page,
                            prev: page - 1,
                            hasPrev: ((page - 1) !== 0),
                            next: page + 1,
                            hasNext: ((page + 1) <= Math.ceil(count / limit)),
                            total: Math.ceil(count / limit)
                        },
                        items: {
                            limit: limit,
                            begin: Math.min(count, ((page * limit) - limit) + 1),
                            end: Math.min(count, page * limit),
                            total: count
                        }
                    };
                });
        }
    });
    if (areValidProperty) {
        extend(Dao, {
            areValid(toCheck, organisation) {
                if (!hasItems(toCheck) || !areValidProperty) {
                    return Bluebird.resolve({});
                } else {
                    let conditions = {isActive: true, organisation};
                    /*istanbul ignore if*/
                    if (areValidProperty === '_id') {
                        toCheck = toCheck.map(id => Dao.ObjectID(id));
                    }
                    conditions[areValidProperty] = {$in: toCheck};
                    return Dao.find(conditions)
                        .then(docs => {
                            let results = {};
                            docs.forEach(doc => results[doc[areValidProperty]] = true);
                            toCheck.forEach(e => results[e] = !!results[e]);
                            return results;
                        });
                }
            }
        });
    }
    return Dao;
}
function propDescriptors(properties) {
    return properties.map(p => {
        return {
            name: p,
            path: p.split('.'),
            method: `set${p.split('.').map(upperFirst).join('')}`
        };
    });
}
function arrDescriptors(lists) {
    return lists.map(l => {
        const methodSuffix = l.split('.').map(upperFirst).join('');
        let pathadd = l.split('.');
        pathadd[pathadd.length - 1] = `added${upperFirst(pathadd[pathadd.length - 1])}`;
        let pathrem = l.split('.');
        pathrem[pathrem.length - 1] = `removed${upperFirst(pathrem[pathrem.length - 1])}`;
        return {
            name: l,
            path: l.split('.'),
            methodSuffix: methodSuffix,
            added: pathadd,
            addMethod: `add${methodSuffix}`,
            removed: pathrem,
            removeMethod: `remove${methodSuffix}`,
            isPresentIn: `isPresentIn${methodSuffix}`
        };
    });
}
function withSetMethods(model, properties) {
    properties
        .map(p => {
            const {method, path, name} = p;
            return {
                [method](newValue, by) {
                    const origval = get(this, path);
                    if (!isUndefined(newValue) && !isEqual(origval, newValue)) {
                        this.trackChanges(name, origval, newValue, by);
                        set(this, path, newValue);
                    }
                    return this;
                }
            };
        })
        .map(setMethod => extend(model.prototype, setMethod));
    return model;
}
function withArrMethods(model, lists) {
    lists
        .map(role => {
            const {path, name, isPresentIn, addMethod, removeMethod} = role;
            return {
                [isPresentIn](toCheck) {
                    return !!find(get(this, path), item => isEqual(item, toCheck));
                },
                [addMethod](toAdd, by) {
                    const list = get(this, path);
                    toAdd.forEach(memberToAdd => {
                        const found = find(list, item => isEqual(item, memberToAdd));
                        if (!found) {
                            list.push(memberToAdd);
                            this.trackChanges(`add ${name}`, null, memberToAdd, by);
                        }
                    }, this);
                    return this;
                },
                [removeMethod](toRemove, by) {
                    const list = get(this, path);
                    toRemove.forEach(memberToRemove => {
                        const removed = remove(list, item => isEqual(item, memberToRemove));
                        if (hasItems(removed)) {
                            this.trackChanges(`remove ${name}`, memberToRemove, null, by);
                        }
                    }, this);
                    return this;
                }
            };
        })
        .map(arrMethods => extend(model.prototype, arrMethods));
    return model;
}
function withUpdate(model, props, arrs, updateMethod) {
    extend(model.prototype, {
        [updateMethod](doc, by) {
            props.forEach(p => {
                let {method, path} = p;
                const u = get(doc.payload, path);
                if (!isUndefined(u)) {
                    this[method](u, by);
                }
            }, this);
            arrs.forEach(arr => {
                let {removed: removedItems, removeMethod, added: addedItems, addMethod} = arr;
                const toRemove = get(doc.payload, removedItems);
                if (!isUndefined(toRemove) && hasItems(toRemove)) {
                    this[removeMethod](toRemove, by);
                }
                const toAdd = get(doc.payload, addedItems);
                if (!isUndefined(toAdd) && hasItems(toAdd)) {
                    this[addMethod](toAdd, by);
                }
            }, this);
            return this;
        }
    });
    return model;
}
function withApproveRejectJoinLeave(model, affectedRole, needsApproval) {
    const needsApprovalMethodSuffix = needsApproval.split('.').map(upperFirst).join('');
    const affectedRoleMethodSuffix = affectedRole.split('.').map(upperFirst).join('');
    let toAdd = affectedRole.split('.');
    toAdd[toAdd.length - 1] = `added${upperFirst(toAdd[toAdd.length - 1])}`;
    extend(model.prototype, {
        join(doc, by) {
            const method = this.access === 'public' ? affectedRoleMethodSuffix : needsApprovalMethodSuffix;
            return this[`add${method}`]([by], by);
        },
        approve(doc, by) {
            this[`add${affectedRoleMethodSuffix}`](get(doc.payload, toAdd), by);
            this[`remove${needsApprovalMethodSuffix}`](get(doc.payload, toAdd), by);
            return this;
        },
        reject(doc, by) {
            return this[`remove${needsApprovalMethodSuffix}`](get(doc.payload, toAdd), by);
        },
        leave(doc, by) {
            return this[`remove${affectedRoleMethodSuffix}`]([by], by);
        }
    });
    return model;
}
function withI18n(model, fields) {
    extend(model.prototype, {
        i18n(locale) {
            fields.forEach(field => {
                if (isArray(this[field]) && this[field].length === 2) {
                    this[field] = i18n.__({phrase: this[field][0], locale}, this[field][1]);
                }
            }, this);
            return this;
        }
    });
}
function withSave(model, saveAudit, idForAudit = '_id') {
    extend(model.prototype, {
        save() {
            if (this.__isModified) {
                this.__isModified = false;
                return model.saveChangeHistory(this.audit)
                    .then(() => {
                        this.audit = undefined;
                        return model.upsert(this);
                    });
            } else {
                return Bluebird.resolve(this);
            }
        },
        del(doc, by) {
            return this.deactivate(by);
        },
        deactivate(by) {
            return this.setIsActive(false, by);
        },
        reactivate(by) {
            return this.setIsActive(true, by);
        },
        trackChanges(action, origValues, newValues, by) {
            const now = new Date();
            /*istanbul ignore else*/
            if (saveAudit) {
                this.audit = this.audit || {
                        objectChangedType: model.collection,
                        objectChangedId: this[idForAudit],
                        organisation: this.organisation,
                        objectVersion: this.objectVersion || 1,
                        schemaVersion: this.schemaVersion || model.schemaVersion,
                        change: []
                    };
                this.audit.change.push({action, origValues, newValues});
                this.audit.by = by;
                this.audit.on = now;
            }
            this.__isModified = true;
            this.updatedBy = by;
            this.updatedOn = now;
            return this;
        }
    });
    return model;
}
const build = function build(toBuild, schema, model, extendModels, areValidProperty = undefined) {
    if (!schema.isVirtualModel) {
        withSchemaProperties(toBuild, schema.connection, schema.collection, schema.indexes, model, schema.schemaVersion);
        withSetupMethods(toBuild, schema.nonEnumerables || []);
        withModifyMethods(toBuild, schema.isReadonly, schema.saveAudit, schema.idForAudit);
        withFindMethods(toBuild, areValidProperty);
    }
    if (schema.updateMethod) {
        const props = propDescriptors(schema.updateMethod.props);
        const arrs = arrDescriptors(schema.updateMethod.arrProps || []);
        withSetMethods(toBuild, props);
        withArrMethods(toBuild, arrs);
        withUpdate(toBuild, props, arrs, schema.updateMethod.method);
    }
    if (schema.joinApproveRejectLeave) {
        const {affectedRole, needsApproval} = schema.joinApproveRejectLeave;
        withApproveRejectJoinLeave(toBuild, affectedRole, needsApproval);
    }
    if (!schema.isVirtualModel && !schema.isReadonly) {
        withSave(toBuild, schema.saveAudit, schema.idForAudit);
    }
    if (hasItems(schema.i18n)) {
        withI18n(toBuild, schema.i18n);
    }
    if (hasItems(extendModels)) {
        extendModels.forEach(fromVirtualModel => {
            extend(toBuild, omit(fromVirtualModel, ['schema', 'create']));
            extend(toBuild.prototype, fromVirtualModel.prototype);
        });
    }
    return toBuild;
};
module.exports = {
    db,
    connect,
    disconnect,
    build
};
