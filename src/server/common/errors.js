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
            this.i18nError = function i18nError(locale) {//stupid babel 6
                return Boom[this.errorType](i18n.__({phrase: this.phrase, locale: locale}, this.data));
            };
            Error.captureStackTrace(this, CustomError);
        }
    }
    return CustomError;
}
module.exports = {
    UserNotFoundError: makeCustomError('UserNotFound',
        'UserNotFoundError',
        'notFound',
        '{{email}} not found'),
    UserNotLoggedInError: makeCustomError('UserNotLoggedIn',
        'UserNotLoggedInError',
        'unauthorized',
        '{{email}} not logged in'),
    SessionExpiredError: makeCustomError('SessionExpired',
        'SessionExpiredError',
        'unauthorized',
        'Your ({{email}}) session has expired, login again'),
    SessionCredentialsNotMatchingError: makeCustomError('SessionCredentialsNotMatching',
        'SessionCredentialsNotMatchingError',
        'unauthorized',
        '{{email}} does not have the right credentials, login again'),
    IncorrectPasswordError: makeCustomError('IncorrectPassword',
        'IncorrectPasswordError',
        'unauthorized',
        'Invalid password for {{email}}'),
    ArchivedPostUpdateError: makeCustomError('ArchivedPostUpdate',
        'ArchivedPostUpdateError',
        'conflict',
        'Cannot update archived posts'),
    ObjectNotCreatedError: makeCustomError('ObjectNotCreated',
        'ObjectNotCreatedError',
        'notFound',
        '{{collection}} object could not be created.'),
    ObjectAlreadyExistsError: makeCustomError('ObjectAlreadyExists',
        'ObjectAlreadyExistsError',
        'conflict',
        'Object already exists'),
    ObjectNotFoundError: makeCustomError('ObjectNotFound',
        'ObjectNotFoundError',
        'notFound',
        '{{type}} ({{idstr}}) not found'),
    NotAMemberOfValidGroupError: makeCustomError('NotAMemberOfValidGroup',
        'NotAMemberOfValidGroup',
        'unauthorized',
        'Only members of {{owners}} group are permitted to perform this action'),
    NotValidUsersOrGroupsError: makeCustomError('NotValidUsersOrGroups',
        'NotValidUsersOrGroupsError',
        'badData',
        'Bad user / groups : {{msg}}'),
    AbusiveLoginAttemptsError: makeCustomError('AbusiveLoginAttempts',
        'AbusiveLoginAttemptsError',
        'tooManyRequests',
        'Maximum number of auth attempts reached. Please try again later.'),
    PasswordResetError: makeCustomError('PasswordResetFailed',
        'PasswordResetError',
        'badRequest',
        'Invalid email or key.'),
    NoPermissionsForActionError: makeCustomError('NoPermissionsForAction',
        'NoPermissionsForActionError',
        'forbidden',
        'Permission denied {{action}} on {{object}} for user {{user}}'),
    NotObjectOwnerError: makeCustomError('NotObjectOwner',
        'NotObjectOwnerError',
        'forbidden',
        '{{email}} does not have permission to modify')
};
