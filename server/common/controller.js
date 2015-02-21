'use strict';
var Joi = require('joi');
var Boom = require('boom');
var AuthPlugin = require('./../common/auth');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');
var Users = require('./../users/model');

var Controller = {};

var isUnique = function (Model, queryBuilder) {
    return function (request, reply) {
        if (queryBuilder) {
            var query = queryBuilder(request);
            Model._findOne(query)
                .then(function (f) {
                    if (f) {
                        reply(Boom.conflict('Object already exists'));
                    } else {
                        reply(true);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

var areValid = function (Model, docPropertyToLookup, payloadPropertyToLookup) {
    return function (request, reply) {
        if (request.payload[payloadPropertyToLookup] && request.payload[payloadPropertyToLookup].length > 0) {
            var msg = 'Bad data : ';
            Model.areValid(docPropertyToLookup, request.payload[payloadPropertyToLookup], request.auth.credentials.user.organisation)
                .then(function (validated) {
                    _.forEach(request.payload[payloadPropertyToLookup], function (a) {
                        if (!validated[a]) {
                            msg += a + ',';
                        }
                    });
                })
                .then(function () {
                    if (msg.indexOf(',') > -1) {
                        reply(Boom.badData(msg));
                    } else {
                        reply();
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        } else {
            reply();
        }
    };
};

module.exports.areValid = areValid;

var validAndPermitted = function (Model, idProperty, groups){
    return function (request, reply) {
        Model.isValid(BaseModel.ObjectID(request.params[idProperty]), groups, request.auth.credentials.user.email)
            .then(function (m) {
                var cases = {
                    'valid': function () {
                        reply();
                    },
                    'not found': function () {
                        reply(Boom.notFound(JSON.stringify(m)));
                    }
                };
                cases['not a member of ' + JSON.stringify(groups) + ' list'] = function () {
                    reply(Boom.unauthorized(JSON.stringify(m)));
                };
                cases[m.message]();
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    };
};

module.exports.validAndPermitted = validAndPermitted;


Controller.find = function (component, model, validator, queryBuilder) {
    validator.query.fields = Joi.string();
    validator.query.sort = Joi.string();
    validator.query.limit = Joi.number().default(20);
    validator.query.page = Joi.number().default(1);

    return {
        validator: validator,
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var query = queryBuilder(request);
            query.organisation = query.organisation || {$regex: new RegExp('^.*?' + request.auth.credentials.user.organisation + '.*$', 'i')};
            if (request.query.isActive) {
                query.isActive = request.query.isActive === '"true"';
            }
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;
            model.pagedFind(query, fields, sort, limit, page, function (err, results) {
                if (err) {
                    reply(Boom.badImplementation(err));
                } else {
                    reply(results);
                }
            });
        }
    };
};

Controller.findOne = function (component, Model) {
    return {
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            Model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                    } else {
                        reply(f);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

Controller.new = function (component, Model, validator, prereqs, uniqueCheck, newCb) {
    return {
        validator: validator,
        pre: _.flatten([AuthPlugin.preware.ensurePermissions('update', component),
            {assign: 'isUnique', method: isUnique(Model, uniqueCheck)},
            prereqs]),
        handler: function (request, reply) {
            var by = request.auth.credentials.user.email;
            newCb ? newCb(request, by) : Model.newObject(request, by)
                .then(function (n) {
                    if (!n) {
                        reply(Boom.notFound(component + ' could not be created.'));
                    } else {
                        reply(n).code(201);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

Controller.update = function (component, Model, validator, prereqs, updateCb) {
    var perms = _.find(prereqs, function (prereq) {
        return prereq.assign === 'ensurePermissions';
    });
    var pre = _.flatten([perms ? [] : AuthPlugin.preware.ensurePermissions('update', component), prereqs]);
    return {
        validator: validator,
        pre: pre,
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            Model._findOne({_id: id})
                .then(function (u) {
                    if (!u) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                        return false;
                    } else {
                        var by = request.auth.credentials.user.email;
                        return u[updateCb](request, by).save();
                    }
                })
                .then(function (u) {
                    if (u) {
                        reply(u);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

Controller.delete = function (component, Model) {
    var ret = Controller.update(component, Model, undefined, [], 'del');
    return ret;
};

Controller.join = function (component, Model, toAdd) {
    var validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().includes(Joi.string()).unique();
    var ret = Controller.update(component, Model, validator, [
        AuthPlugin.preware.ensurePermissions('view', component),
        {assign: 'validMembers', method: areValid(Users, 'email', toAdd)}
    ], 'join');
    return ret;
};

Controller.approve = function(component, Model, toAdd, approvers) {
    var validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().includes(Joi.string()).unique();
    var ret = Controller.update(component, Model, validator, [
        {assign: 'validAndPermitted', method: validAndPermitted(Model, 'id', [approvers])},
        {assign: 'validMembers', method: areValid(Users, 'email', toAdd)}
    ], 'approve');
    return ret;
};

Controller.reject = function(component, Model, toAdd, approvers) {
    var validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().includes(Joi.string()).unique();
    var ret = Controller.update(component, Model, validator, [
        {assign: 'validAndPermitted', method: validAndPermitted(Model, 'id', [approvers])},
        {assign: 'validMembers', method: areValid(Users, 'email', toAdd)}
    ], 'reject');
    return ret;
};


module.exports.BaseController = Controller;
