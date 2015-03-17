'use strict';

function UserNotFoundError (email) {
    this.message = 'UserNotFound';
    this.name = 'UserNotFoundError';
    this.errorType = 'notFound';
    this.phrase = '{{email}} not found';
    this.data = {email: email};
    Error.captureStackTrace(this, UserNotFoundError);
}

UserNotFoundError.prototype = Object.create(Error.prototype);

UserNotFoundError.prototype.constructor = UserNotFoundError;

module.exports.UserNotFoundError = UserNotFoundError;

function UserNotLoggedInError (email) {
    this.message = 'UserNotLoggedIn';
    this.name = 'UserNotLoggedInError';
    this.errorType = 'unauthorized';
    this.phrase = '{{email}} not logged in';
    this.data = {email: email};
    Error.captureStackTrace(this, UserNotLoggedInError);
}

UserNotLoggedInError.prototype = Object.create(Error.prototype);

UserNotLoggedInError.prototype.constructor = UserNotLoggedInError;

module.exports.UserNotLoggedInError = UserNotLoggedInError;

function SessionExpiredError (email) {
    this.message = 'SessionExpired';
    this.name = 'SessionExpiredError';
    this.errorType = 'unauthorized';
    this.phrase = 'Your ({{email}}) session has expired, login again';
    this.data = {email: email};
    Error.captureStackTrace(this, SessionExpiredError);
}

SessionExpiredError.prototype = Object.create(Error.prototype);

SessionExpiredError.prototype.constructor = SessionExpiredError;

module.exports.SessionExpiredError = SessionExpiredError;

function SessionCredentialsNotMatchingError (email) {
    this.message = 'SessionCredentialsNotMatching';
    this.name = 'SessionCredentialsNotMatchingError';
    this.errorType = 'unauthorized';
    this.phrase = '{{email}} does not have the right credentials, login again';
    this.data = {email: email};
    Error.captureStackTrace(this, SessionCredentialsNotMatchingError);
}

SessionCredentialsNotMatchingError.prototype = Object.create(Error.prototype);

SessionCredentialsNotMatchingError.prototype.constructor = SessionCredentialsNotMatchingError;

module.exports.SessionCredentialsNotMatchingError = SessionCredentialsNotMatchingError;

function IncorrectPasswordError (email) {
    this.message = 'IncorrectPassword';
    this.name = 'IncorrectPasswordError';
    this.errorType = 'unauthorized';
    this.phrase = 'Invalid password for {{email}}';
    this.data = {email: email};
    Error.captureStackTrace(this, IncorrectPasswordError);
}

IncorrectPasswordError.prototype = Object.create(Error.prototype);

IncorrectPasswordError.prototype.constructor = IncorrectPasswordError;

module.exports.IncorrectPasswordError = IncorrectPasswordError;


function ArchivedPostUpdateError () {
    this.message = 'ArchivedPostUpdateNotAllowed';
    this.name = 'ArchivedPostUpdateError';
    this.errorType = 'badImplementation';
    this.phrase = 'Cannot update archived posts';
    this.data = {};
    Error.captureStackTrace(this, ArchivedPostUpdateError);
}

ArchivedPostUpdateError.prototype = Object.create(Error.prototype);

ArchivedPostUpdateError.prototype.constructor = ArchivedPostUpdateError;

module.exports.ArchivedPostUpdateError = ArchivedPostUpdateError;
