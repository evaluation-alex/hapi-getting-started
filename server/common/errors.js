'use strict';
const Boom = require('boom');
const config = require('./../config');
const {i18n} = config;
function makeCustomError(message, name, errorType, phrase) {
    class CustomError extends Error {
        constructor(data) {
            super();
            this.message = message;
            this.name = name;
            this.errorType = errorType;
            this.phrase = phrase;
            this.data = data || {};
            this.canMakeBoomError = true;
            Error.captureStackTrace(this, CustomError);
        }
        i18nError(locale) {
            return Boom[this.errorType](i18n.__({phrase: this.phrase, locale: locale}, this.data));
        }
    }
    return CustomError;
}
module.exports.UserNotFoundError = makeCustomError('UserNotFound',
    'UserNotFoundError',
    'notFound',
    '{{email}} not found');
module.exports.UserNotLoggedInError = makeCustomError('UserNotLoggedIn',
    'UserNotLoggedInError',
    'unauthorized',
    '{{email}} not logged in');
module.exports.SessionExpiredError = makeCustomError('SessionExpired',
    'SessionExpiredError',
    'unauthorized',
    'Your ({{email}}) session has expired, login again');
module.exports.SessionCredentialsNotMatchingError = makeCustomError('SessionCredentialsNotMatching',
    'SessionCredentialsNotMatchingError',
    'unauthorized',
    '{{email}} does not have the right credentials, login again');
module.exports.IncorrectPasswordError = makeCustomError('IncorrectPassword',
    'IncorrectPasswordError',
    'unauthorized',
    'Invalid password for {{email}}');
module.exports.ArchivedPostUpdateError = makeCustomError('ArchivedPostUpdate',
    'ArchivedPostUpdateError',
    'conflict',
    'Cannot update archived posts');
module.exports.ObjectNotCreatedError = makeCustomError('ObjectNotCreated',
    'ObjectNotCreatedError',
    'notFound',
    '{{collection}} object could not be created.');
module.exports.ObjectAlreadyExistsError = makeCustomError('ObjectAlreadyExists',
    'ObjectAlreadyExistsError',
    'conflict',
    'Object already exists');
module.exports.ObjectNotFoundError = makeCustomError('ObjectNotFound',
    'ObjectNotFoundError',
    'notFound',
    '{{type}} ({{idstr}}) not found');
module.exports.NotAMemberOfValidGroupError = makeCustomError('NotAMemberOfValidGroup',
    'NotAMemberOfValidGroup',
    'unauthorized',
    'Only members of {{owners}} group are permitted to perform this action');
module.exports.NotValidUsersOrGroupsError = makeCustomError('NotValidUsersOrGroups',
    'NotValidUsersOrGroupsError',
    'badData',
    'Bad user / groups : {{msg}}');
module.exports.AbusiveLoginAttemptsError = makeCustomError('AbusiveLoginAttempts',
    'AbusiveLoginAttemptsError',
    'tooManyRequests',
    'Maximum number of auth attempts reached. Please try again later.');
module.exports.PasswordResetError = makeCustomError('PasswordResetFailed',
    'PasswordResetError',
    'badRequest',
    'Invalid email or key.');
module.exports.NoPermissionsForActionError = makeCustomError('NoPermissionsForAction',
    'NoPermissionsForActionError',
    'forbidden',
    'Permission denied {{action}} on {{object}} for user {{user}}');
module.exports.NotObjectOwnerError = makeCustomError('NotObjectOwner',
    'NotObjectOwnerError',
    'unauthorized',
    '{{email}} does not have permission to modify');
