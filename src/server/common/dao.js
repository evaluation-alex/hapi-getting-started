'use strict';
const _ = require('./../lodash');
const Bluebird = require('bluebird');
const Joi = require('joi');
const mongodb = require('mongodb');
const traverse = require('traverse');
const crypto = require('crypto');
const config = require('./../config');
const utils = require('./utils');
const errors = require('./errors');
const {extend, upperFirst, get, isUndefined, isEqual, set, find, remove, isArray, omit, merge, assign, filter} = _;
const {MongoClient, ObjectID} = mongodb;
const {errback, hasItems, timing} = utils;
const {ObjectNotCreatedError} = errors;
const {i18n, logger} = config;
const connections = {};
function gatherStats(collection, method, query, start, err) {
    timing('dao',
        {collection, method},
        merge({elapsed: Date.now() - start, err: !!err}, query ? {query: Object.keys(query).sort().join('|')} : {})
    );
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
const connect = function connect(name, {url, options}) {
    return new Bluebird((resolve, reject) => {
        if (connections[name]) {
            resolve(connections[name]);
        } else {
            MongoClient.connect(url, options,
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
            return Bluebird.all(Dao.indexes.map(({fields, options}) => {
                return new Bluebird((resolve, reject) => {
                    Dao.clctn().createIndex(fields, options || {}, defaultcb(resolve, reject, Dao.collection, 'createIndex'));
                });
            }));
        },
        validate(obj) {
            const {error} = Joi.validate(obj, Dao.modelSchema, {abortEarly: false, allowUnknown: false});
            /*istanbul ignore next*/
            if (error) {
                console.log('model:', Dao.collection);
                console.log('obj to validate:', obj);
                console.log('error:', error);
            }
        }
    });
}
function withModifyMethods(Dao, isReadonly, saveAudit, idForAudit = '_id') {
    extend(Dao, {
        upsert(obj) {
            const opts = {upsert: true, returnOriginal: false};
            return new Bluebird((resolve, reject) => {
                const toSave = merge({}, {
                    objectVersion: 0,
                    schemaVersion: Dao.schemaVersion,
                    _id: Dao.ObjectID()
                }, obj);
                toSave.objectVersion++;
                Dao.clctn().findOneAndReplace({_id: toSave._id}, toSave, opts,
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
            insertAndAudit(doc, by, organisation = 'silver lining') {
                const now = new Date();
                const toSave = merge({}, doc, {
                    _id: Dao.ObjectID(),
                    organisation,
                    isActive: true,
                    createdBy: by,
                    createdOn: now,
                    updatedBy: by,
                    updatedOn: now,
                    objectVersion: 0,
                    schemaVersion: Dao.schemaVersion
                });
                Dao.validate(toSave);
                return Dao.upsert(toSave)
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
                                    objectVersion: 1,
                                    schemaVersion: Dao.schemaVersion,
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
                const cursor = Dao.clctn().find(query, {fields, sort, limit, skip});
                const results = [];
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
                (data, count) => {
                    return {
                        data,
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
                    const conditions = {isActive: true, organisation};
                    /*istanbul ignore if*/
                    if (areValidProperty === '_id') {
                        toCheck = toCheck.map(id => Dao.ObjectID(id));
                    }
                    conditions[areValidProperty] = {$in: toCheck};
                    return Dao.find(conditions)
                        .then(docs => merge({},
                            toCheck
                                .map(e => ({[e]: false}))
                                .reduce((p, c) => merge(p, c), {}),
                            docs
                                .map(doc => ({[doc[areValidProperty]]: true}))
                                .reduce((p, c) => merge(p, c), {})
                            )
                        );
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
        const pathadd = l.split('.');
        pathadd[pathadd.length - 1] = `added${upperFirst(pathadd[pathadd.length - 1])}`;
        const pathrem = l.split('.');
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
function withSetMethods(Dao, properties) {
    properties
        .map(({method, path, name}) => ({
            [method](newValue, by) {
                const origval = get(this, path);
                if (!isUndefined(newValue) && !isEqual(origval, newValue)) {
                    this.trackChanges(name, origval, newValue, by);
                    set(this, path, newValue);
                }
                return this;
            }
        }))
        .map(setMethod => extend(Dao.prototype, setMethod));
    return Dao;
}
function withArrMethods(Dao, lists) {
    lists
        .map(({path, name, isPresentIn, addMethod, removeMethod}) => ({
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
                });
                return this;
            },
            [removeMethod](toRemove, by) {
                const list = get(this, path);
                toRemove.forEach(memberToRemove => {
                    const removed = remove(list, item => isEqual(item, memberToRemove));
                    if (hasItems(removed)) {
                        set(this, path, filter(list));
                        this.trackChanges(`remove ${name}`, memberToRemove, null, by);
                    }
                });
                return this;
            }
        }))
        .map(arrMethods => extend(Dao.prototype, arrMethods));
    return Dao;
}
function withUpdate(Dao, props, arrs, updateMethod) {
    extend(Dao.prototype, {
        [updateMethod](doc, by) {
            props.forEach(({method, path}) => {
                const u = get(doc.payload, path);
                if (!isUndefined(u)) {
                    this[method](u, by);
                }
            });
            arrs.forEach(({removed: removedItems, removeMethod, added: addedItems, addMethod}) => {
                const toRemove = get(doc.payload, removedItems);
                if (!isUndefined(toRemove) && hasItems(toRemove)) {
                    this[removeMethod](toRemove, by);
                }
                const toAdd = get(doc.payload, addedItems);
                if (!isUndefined(toAdd) && hasItems(toAdd)) {
                    this[addMethod](toAdd, by);
                }
            });
            return this;
        }
    });
    return Dao;
}
function withApproveRejectJoinLeave(Dao, affectedRole, needsApproval) {
    const needsApprovalMethodSuffix = needsApproval.split('.').map(upperFirst).join('');
    const affectedRoleMethodSuffix = affectedRole.split('.').map(upperFirst).join('');
    const toAdd = affectedRole.split('.');
    toAdd[toAdd.length - 1] = `added${upperFirst(toAdd[toAdd.length - 1])}`;
    extend(Dao.prototype, {
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
    return Dao;
}
function withI18n(Dao, fields) {
    extend(Dao.prototype, {
        i18n(locale) {
            fields.forEach(field => {
                if (isArray(this[field]) && this[field].length === 2) {
                    this[field] = i18n.__({phrase: this[field][0], locale}, this[field][1]);
                }
            });
            return this;
        }
    });
    return Dao;
}
function withHashCode(Dao) {
    extend(Dao.prototype, {
        hashCode() {
            const md5 = crypto.createHash('md5');
            traverse(this)
                .reduce(function (acc, x) {
                    if (this.isLeaf) {
                        acc.push(`${this.path.join('.')}#${String(x)}`);
                    }
                    return acc;
                }, [])
                .sort()
                .forEach(k => md5.update(k));
            this.__hashCode__ = md5.digest('hex');
            return this;
        }
    });
    return Dao;
}
function withSave(Dao, saveAudit, idForAudit = '_id') {
    extend(Dao.prototype, {
        save() {
            if (this.__isModified) {
                this.__isModified = false;
                Dao.validate(this);
                return Dao.saveChangeHistory(this.audit)
                    .then(() => {
                        if (this.audit) {
                            this.audit = undefined;
                        }
                        return Dao.upsert(this);
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
                        objectChangedType: Dao.collection,
                        objectChangedId: this[idForAudit],
                        organisation: this.organisation,
                        objectVersion: this.objectVersion,
                        schemaVersion: this.schemaVersion,
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
    return Dao;
}
const build = function build(toBuild, schema, model, extendModels, areValidProperty = undefined) {
    if (!schema.isVirtualModel) {
        withSchemaProperties(toBuild, schema.connection, schema.collection, schema.indexes, model, schema.schemaVersion);
        withSetupMethods(toBuild, schema.nonEnumerables || []);
        withModifyMethods(toBuild, schema.isReadonly, schema.saveAudit, schema.idForAudit);
        withFindMethods(toBuild, areValidProperty);
        withHashCode(toBuild);
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
