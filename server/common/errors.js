'use strict';
var Boom = require('boom');
var i18n = require('./../../config').i18n;

function UserNotFoundError (email) {
    this.email = email;
    this.message = 'UserNotFound';
    this.name = 'UserNotFoundError';
    Error.captureStackTrace(this, UserNotFoundError);
}

UserNotFoundError.prototype = Object.create(Error.prototype);

UserNotFoundError.prototype.constructor = UserNotFoundError;

UserNotFoundError.prototype.getBoomError = function (locale) {
    return Boom.notFound(i18n.__({
        phrase: '{{email}} not found'
    }, {
        email: this.email,
        locale: locale ? locale : 'en'
    }));
};

module.exports.UserNotFoundError = UserNotFoundError;

function UserNotLoggedInError (email) {
    this.email = email;
    this.message = 'UserNotLoggedIn';
    this.name = 'UserNotLoggedInError';
    Error.captureStackTrace(this, UserNotLoggedInError);
}

UserNotLoggedInError.prototype = Object.create(Error.prototype);

UserNotLoggedInError.prototype.constructor = UserNotLoggedInError;

UserNotLoggedInError.prototype.getBoomError = function (locale) {
    return Boom.unauthorized(i18n.__({
        phrase: '{{email}} not logged in'
    }, {
        email: this.email,
        locale: locale ? locale : 'en'
    }));
};

module.exports.UserNotLoggedInError = UserNotLoggedInError;

function SessionExpiredError (email) {
    this.email = email;
    this.message = 'SessionExpired';
    this.name = 'SessionExpiredError';
    Error.captureStackTrace(this, SessionExpiredError);
}

SessionExpiredError.prototype = Object.create(Error.prototype);

SessionExpiredError.prototype.constructor = SessionExpiredError;

SessionExpiredError.prototype.getBoomError = function (locale) {
    return Boom.unauthorized(i18n.__({
        phrase: 'Your ({{email}}) session has expired, login again'
    }, {
        email: this.email,
        lcoale: locale ? locale : 'en'
    }));
};

module.exports.SessionExpiredError = SessionExpiredError;

function SessionCredentialsNotMatchingError (email) {
    this.email = email;
    this.message = 'SessionCredentialsNotMatching';
    this.name = 'SessionCredentialsNotMatchingError';
    Error.captureStackTrace(this, SessionCredentialsNotMatchingError);
}

SessionCredentialsNotMatchingError.prototype = Object.create(Error.prototype);

SessionCredentialsNotMatchingError.prototype.constructor = SessionCredentialsNotMatchingError;

SessionCredentialsNotMatchingError.prototype.getBoomError = function (locale) {
    return Boom.unauthorized(i18n.__({
        phrase: '{{email}} does not have the right credentials, login again'
    }, {
        email: this.email,
        locale: locale ? locale : 'en'
    }));
};

module.exports.SessionCredentialsNotMatchingError = SessionCredentialsNotMatchingError;

function IncorrectPasswordError (email) {
    this.email = email;
    this.message = 'IncorrectPassword';
    this.name = 'IncorrectPasswordError';
    Error.captureStackTrace(this, IncorrectPasswordError);
}

IncorrectPasswordError.prototype = Object.create(Error.prototype);

IncorrectPasswordError.prototype.constructor = IncorrectPasswordError;

IncorrectPasswordError.prototype.getBoomError = function (locale) {
    return Boom.unauthorized(i18n.__({
        phrase: 'Invalid password for {{email}}'
    }, {
        email: this.email,
        locale: locale ? locale : 'en'
    }));
};

module.exports.IncorrectPasswordError = IncorrectPasswordError;


function ArchivedPostUpdateError () {
    this.message = 'ArchivedPostUpdateNotAllowed';
    this.name = 'ArchivedPostUpdateError';
    Error.captureStackTrace(this, ArchivedPostUpdateError);
}

ArchivedPostUpdateError.prototype = Object.create(Error.prototype);

ArchivedPostUpdateError.prototype.constructor = ArchivedPostUpdateError;

ArchivedPostUpdateError.prototype.getBoomError = function (locale) {
    return Boom.badImplementation(i18n.__({phrase: 'Cannot update archived posts', locale: locale ? locale : 'en'}));
};

module.exports.ArchivedPostUpdateError = ArchivedPostUpdateError;
