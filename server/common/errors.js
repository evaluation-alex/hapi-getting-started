'use strict';

var CustomErrorFactory = function CustomErrorFactory (message, name, errorType, phrase) {
    var CustomError = function CustomError (data) {
        this.message = message;
        this.name = name;
        this.errorType = errorType;
        this.phrase = phrase;
        this.data = data || {};
        Error.captureStackTrace(this, CustomError);
    };
    CustomError.prototype = Object.create(Error.prototype);
    CustomError.constructor = CustomError;
    return CustomError;
};

module.exports.UserNotFoundError = new CustomErrorFactory('UserNotFound',
    'UserNotFoundError',
    'notFound',
    '{{email}} not found');

module.exports.UserNotLoggedInError = new CustomErrorFactory('UserNotLoggedIn',
    'UserNotLoggedInError',
    'unauthorized',
    '{{email}} not logged in');

module.exports.SessionExpiredError = new CustomErrorFactory('SessionExpired',
    'SessionExpiredError',
    'unauthorized',
    'Your ({{email}}) session has expired, login again');

module.exports.SessionCredentialsNotMatchingError = new CustomErrorFactory('SessionCredentialsNotMatching',
    'SessionCredentialsNotMatchingError',
    'unauthorized',
    '{{email}} does not have the right credentials, login again');

module.exports.IncorrectPasswordError = new CustomErrorFactory('IncorrectPassword',
    'IncorrectPasswordError',
    'unauthorized',
    'Invalid password for {{email}}');

module.exports.ArchivedPostUpdateError = new CustomErrorFactory('ArchivedPostUpdate',
    'ArchivedPostUpdateError',
    'conflict',
    'Cannot update archived posts');

module.exports.ObjectNotCreatedError = new CustomErrorFactory('ObjectNotCreated',
    'ObjectNotCreatedError',
    'notFound',
    '{{collection}} object could not be created.');

module.exports.ObjectAlreadyExistsError = new CustomErrorFactory('ObjectAlreadyExists',
    'ObjectAlreadyExistsError',
    'conflict',
    'Object already exists');

module.exports.ObjectNotFoundError = new CustomErrorFactory('ObjectNotFound',
    'ObjectNotFoundError',
    'notFound',
    '{{type}} ({{idstr}}) not found');

module.exports.NotAMemberOfValidGroupError = new CustomErrorFactory('NotAMemberOfValidGroup',
    'NotAMemberOfValidGroup',
    'unauthorized',
    'Only members of {{owners}} group are permitted to perform this action');

module.exports.NotValidUsersOrGroupsError = new CustomErrorFactory('NotValidUsersOrGroups',
    'NotValidUsersOrGroupsError',
    'badData',
    'Bad user / groups : {{msg}}');

module.exports.AbusiveLoginAttemptsError = new CustomErrorFactory('AbusiveLoginAttempts',
    'AbusiveLoginAttemptsError',
    'tooManyRequests',
    'Maximum number of auth attempts reached. Please try again later.');

module.exports.PasswordResetError = new CustomErrorFactory('PasswordResetFailed',
    'PasswordResetError',
    'badRequest',
    'Invalid email or key.');
