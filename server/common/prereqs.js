'use strict';
import {get, flatten, capitalize, find} from 'lodash';
import Bluebird from 'bluebird';
import Joi from 'joi';
import {hasItems, org, logAndBoom, user, by, lookupParamsOrPayloadOrQuery, ip} from './utils';
import {NotValidUsersOrGroupsError, NoPermissionsForActionError, NotAMemberOfValidGroupError,
    ObjectAlreadyExistsError, NotObjectOwnerError, ObjectNotFoundError, AbusiveLoginAttemptsError} from './errors';
import Users from './../users/model';
import AuthAttempts from './../users/session/auth-attempts/model';
import UserGroups from './../user-groups/model';
import Posts from './../blogs/posts/model';
function buildAreValid(Model, pldPropToLookup) {
    return function areValid(request, reply) {
        let toLookup = [];
        pldPropToLookup.forEach(pldProp => {
            const arrInReq = get(request.payload, pldProp.split('.'));
            if (hasItems(arrInReq)) {
                toLookup.push(arrInReq);
            }
        });
        toLookup = flatten(toLookup);
        if (hasItems(toLookup)) {
            reply(
                Model.areValid(toLookup, org(request))
                .then(validated => {
                    let msg = '';
                    toLookup.forEach(a => {
                        if (!validated[a]) {
                            msg += a.toString() + ',';
                        }
                    });
                    return (msg.indexOf(',') > -1) ? Bluebird.reject(new NotValidUsersOrGroupsError({msg})) : true;
                })
                .catch(logAndBoom)
            );
        } else {
            reply(true);
        }
    };
}
export function areValidUsers(payloadPropertiesToLookup) {
    return {
        assign: 'validUsers',
        method: buildAreValid(Users, payloadPropertiesToLookup)
    };
}
export function areValidGroups(payloadPropertiesToLookup) {
    return {
        assign: 'validUserGroups',
        method: buildAreValid(UserGroups, payloadPropertiesToLookup)
    };
}
export function areValidPosts(payloadPropertiesToLookup) {
    return {
        assign: 'validPosts',
        method: buildAreValid(Posts, payloadPropertiesToLookup)
    };
}
function ensurePermissions(action, object) {
    return {
        assign: 'ensurePermissions',
        method(request, reply) {
            reply(
                !user(request).hasPermissionsTo(action, object) ?
                    new NoPermissionsForActionError({action, object, user: by(request)}) :
                    true
            );
        }
    };
}
export function canView(object) {
    return ensurePermissions('view', object);
}
export function canUpdate(object) {
    return ensurePermissions('update', object);
}
export function isMemberOf(Model, groups) {
    return {
        assign: 'isMemberOf' + capitalize(Model.collection) + '(' + groups.join(',') + ')',
        method(request, reply) {
            const obj = request.pre[Model.collection];
            const user = by(request);
            if (user === 'root' || !!find(groups, role => obj['isPresentIn' + role.split('.').map(capitalize).join('')](user))) {
                reply(true);
            } else {
                reply(new NotAMemberOfValidGroupError({owners: JSON.stringify(groups)}));
            }
            return {message: 'not permitted'};
        }
    };
}
export function uniqueCheck(Model, queryBuilder) {
    return {
        assign: 'uniqueCheck',
        method(request, reply) {
            reply(
                Model.findOne(queryBuilder(request))
                .then(f => f ? Bluebird.reject(new ObjectAlreadyExistsError()): true)
                .catch(logAndBoom)
            );
        }
    };
}
export function onlyOwner(Model, fieldToVerifyAgainst = 'email') {
    return {
        assign: 'allowedToViewOrEditPersonalInfo',
        method(request, reply) {
            const u = by(request);
            if ((request.pre[Model.collection][fieldToVerifyAgainst] === u) || (u === 'root')) {
                reply(true);
            } else {
                reply(new NotObjectOwnerError({email: u}));
            }
        }
    };
}
export function prePopulate(Model, idToUse) {
    return {
        assign: Model.collection,
        method(request, reply) {
            const id = lookupParamsOrPayloadOrQuery(request, idToUse);
            reply(
                Model.findOne({_id: Model.ObjectID(id)})
                .then(obj => !obj ?
                    Bluebird.reject(new ObjectNotFoundError({type: capitalize(Model.collection), idstr: id.toString()})) :
                    obj)
                .catch(logAndBoom)
            );
        }
    };
}
export function abuseDetected() {
    return {
        assign: 'abuseDetected',
        method(request, reply) {
            reply(
                AuthAttempts.abuseDetected(ip(request), request.payload.email)
                .then(detected => detected ? Bluebird.reject(new AbusiveLoginAttemptsError()) : false)
                .catch(logAndBoom)
            );
        }
    };
}

export function findValidator(validator) {
    validator.query.fields = Joi.string();
    validator.query.sort = Joi.string();
    validator.query.limit = Joi.number();
    validator.query.page = Joi.number();
    return validator;
}
