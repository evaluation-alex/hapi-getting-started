'use strict';
const _ = require('./../lodash');
const utils = require('./utils');
const errors = require('./errors');
const Bluebird = require('bluebird');
const Joi = require('joi');
const {get, flatten, filter, upperFirst, find, isFunction} = _;
const {hasItems, org, logAndBoom, user, by, lookupParamsOrPayloadOrQuery, ip, buildQuery, profile} = utils;
const {NotValidUsersOrGroupsError, NoPermissionsForActionError, NotAMemberOfValidGroupError,
    ObjectAlreadyExistsError, NotObjectOwnerError, ObjectNotFoundError, AbusiveLoginAttemptsError} = errors;
const Users = require('./../users/model');
const AuthAttempts = require('./../auth-attempts/model');
const UserGroups = require('./../user-groups/model');
const Posts = require('./../posts/model');
function buildAreValid(Model, pldPropToLookup) {
    const timing = profile('handler', {collection: Model.collection, method: 'areValid', type: 'pre'});
    return function areValid(request, reply) {
        const start = Date.now();
        const toLookup = filter(flatten(pldPropToLookup.map(pldProp => get(request.payload, pldProp.split('.')))));
        if (hasItems(toLookup)) {
            Model.areValid(toLookup, org(request))
                .then(validated => {
                    const msg = toLookup.map(a => !validated[a] ? a.toString() + ',' : '').join('');
                    return (msg.indexOf(',') > -1) ? Bluebird.reject(new NotValidUsersOrGroupsError({msg})) : true;
                })
                .catch(logAndBoom)
                .then(reply)
                .finally(() => timing(start));
        } else {
            reply(true);
            timing(start);
        }
    };
}
const areValidUsers = function areValidUsers(payloadPropertiesToLookup) {
    return {
        assign: 'validUsers',
        method: buildAreValid(Users, payloadPropertiesToLookup)
    };
};
const areValidGroups = function areValidGroups(payloadPropertiesToLookup) {
    return {
        assign: 'validUserGroups',
        method: buildAreValid(UserGroups, payloadPropertiesToLookup)
    };
};
const areValidPosts = function areValidPosts(payloadPropertiesToLookup) {
    return {
        assign: 'validPosts',
        method: buildAreValid(Posts, payloadPropertiesToLookup)
    };
};
function ensurePermissions(action, object) {
    const timing = profile('handler', {collection: object, method: 'ensurePermissions', type: 'pre'});
    return {
        assign: 'ensurePermissions',
        method(request, reply) {
            const start = Date.now();
            reply(
                !user(request).hasPermissionsTo(action, object) ?
                    new NoPermissionsForActionError({action, object, user: by(request)}) :
                    true
            );
            timing(start);
        }
    };
}
const canView = function canView(object) {
    return ensurePermissions('view', object);
};
const canUpdate = function canUpdate(object) {
    return ensurePermissions('update', object);
};
const isMemberOf = function isMemberOf(Model, groups) {
    const timing = profile('handler', {collection: Model.collection, method: 'isMemberOf', type: 'pre'});
    return {
        assign: `isMemberOf${upperFirst(Model.collection)}(${groups.join(',')})`,
        method(request, reply) {
            const start = Date.now();
            const obj = request.pre[Model.collection];
            const user = by(request);
            if (user === 'root' || !!find(groups, role => obj[`isPresentIn${role.split('.').map(upperFirst).join('')}`](user))) {
                reply(true);
            } else {
                reply(new NotAMemberOfValidGroupError({owners: JSON.stringify(groups)}));
            }
            timing(start);
            return {message: 'not permitted'};
        }
    };
};
const uniqueCheck = function uniqueCheck(Model, queryBuilder) {
    const timing = profile('handler', {collection: Model.collection, method: 'uniqueCheck', type: 'pre'});
    return {
        assign: 'uniqueCheck',
        method(request, reply) {
            const start = Date.now();
            Model.findOne(queryBuilder(request))
                .then(f => f ? Bluebird.reject(new ObjectAlreadyExistsError()) : true)
                .catch(logAndBoom)
                .then(reply)
                .finally(() => timing(start));
        }
    };
};
const onlyOwner = function onlyOwner(Model) {
    const timing = profile('handler', {collection: Model.collection, method: 'onlyOwner', type: 'pre'});
    return {
        assign: 'allowedToViewOrEditPersonalInfo',
        method(request, reply) {
            const start = Date.now();
            const u = by(request);
            if ((request.pre[Model.collection].email === u) || (u === 'root')) {
                reply(true);
            } else {
                reply(new NotObjectOwnerError({email: u}));
            }
            timing(start);
        }
    };
};
const prePopulate = function prePopulate(Model, idToUse) {
    const timing = profile('handler', {collection: Model.collection, method: 'prePopulate', type: 'pre'});
    return {
        assign: Model.collection,
        method(request, reply) {
            const start = Date.now();
            const id = lookupParamsOrPayloadOrQuery(request, idToUse);
            Model.findOne({_id: Model.ObjectID(id)})
                .then(obj => !obj ?
                    Bluebird.reject(new ObjectNotFoundError({
                        type: upperFirst(Model.collection),
                        idstr: id ? id.toString() : /*istanbul ignore next*/'No id passed'
                    })) : obj)
                .catch(logAndBoom)
                .then(reply)
                .finally(() => timing(start));
        }
    };
};
const abuseDetected = function abuseDetected() {
    const timing = profile('handler', {collection: 'User', method: 'abuseDetected', type: 'pre'});
    return {
        assign: 'abuseDetected',
        method(request, reply) {
            const start = Date.now();
            AuthAttempts.abuseDetected(ip(request), request.payload.email)
                .then(detected => detected ? Bluebird.reject(new AbusiveLoginAttemptsError()) : false)
                .catch(logAndBoom)
                .then(reply)
                .finally(() => timing(start));
        }
    };
};
const buildMongoQuery = function buildMongoQuery(Model, findOptions, builder) {
    const timing = profile('handler', {collection: Model.collection, method: 'buildMongoQuery', type: 'pre'});
    const buildP = Bluebird.method((request) => {
        return (builder && isFunction(builder)) ?
            builder(request, findOptions) :
            buildQuery(request, findOptions);
    });
    return {
        assign: 'mongoQuery',
        method(request, reply) {
            const start = Date.now();
            buildP(request)
                .then(query => {
                    query.organisation = query.organisation || org(request);
                    if (request.query.isActive) {
                        query.isActive = request.query.isActive === '"true"';
                    }
                    return query;
                })
                .catch(logAndBoom)
                .then(reply)
                .finally(() => timing(start));
        }
    }
};
const findValidator = function findValidator(validator, {sort, limit, page} = defaults) {
    validator.query.fields = Joi.string();
    validator.query.sort = Joi.string().default(sort);
    validator.query.limit = Joi.number().default(limit);
    validator.query.page = Joi.number().default(page);
    return validator;
};
module.exports = {
    areValidUsers,
    areValidGroups,
    areValidPosts,
    canView,
    canUpdate,
    isMemberOf,
    uniqueCheck,
    onlyOwner,
    prePopulate,
    abuseDetected,
    findValidator,
    buildMongoQuery
};
