'use strict';
import Boom from 'boom';
import config from './../config';
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
export const UserNotFoundError = makeCustomError('UserNotFound',
    'UserNotFoundError',
    'notFound',
    '{{email}} not found');
export const UserNotLoggedInError = makeCustomError('UserNotLoggedIn',
    'UserNotLoggedInError',
    'unauthorized',
    '{{email}} not logged in');
export const SessionExpiredError = makeCustomError('SessionExpired',
    'SessionExpiredError',
    'unauthorized',
    'Your ({{email}}) session has expired, login again');
export const SessionCredentialsNotMatchingError = makeCustomError('SessionCredentialsNotMatching',
    'SessionCredentialsNotMatchingError',
    'unauthorized',
    '{{email}} does not have the right credentials, login again');
export const IncorrectPasswordError = makeCustomError('IncorrectPassword',
    'IncorrectPasswordError',
    'unauthorized',
    'Invalid password for {{email}}');
export const ArchivedPostUpdateError = makeCustomError('ArchivedPostUpdate',
    'ArchivedPostUpdateError',
    'conflict',
    'Cannot update archived posts');
export const ObjectNotCreatedError = makeCustomError('ObjectNotCreated',
    'ObjectNotCreatedError',
    'notFound',
    '{{collection}} object could not be created.');
export const ObjectAlreadyExistsError = makeCustomError('ObjectAlreadyExists',
    'ObjectAlreadyExistsError',
    'conflict',
    'Object already exists');
export const ObjectNotFoundError = makeCustomError('ObjectNotFound',
    'ObjectNotFoundError',
    'notFound',
    '{{type}} ({{idstr}}) not found');
export const NotAMemberOfValidGroupError = makeCustomError('NotAMemberOfValidGroup',
    'NotAMemberOfValidGroup',
    'unauthorized',
    'Only members of {{owners}} group are permitted to perform this action');
export const NotValidUsersOrGroupsError = makeCustomError('NotValidUsersOrGroups',
    'NotValidUsersOrGroupsError',
    'badData',
    'Bad user / groups : {{msg}}');
export const AbusiveLoginAttemptsError = makeCustomError('AbusiveLoginAttempts',
    'AbusiveLoginAttemptsError',
    'tooManyRequests',
    'Maximum number of auth attempts reached. Please try again later.');
export const PasswordResetError = makeCustomError('PasswordResetFailed',
    'PasswordResetError',
    'badRequest',
    'Invalid email or key.');
export const NoPermissionsForActionError = makeCustomError('NoPermissionsForAction',
    'NoPermissionsForActionError',
    'forbidden',
    'Permission denied {{action}} on {{object}} for user {{user}}');
export const NotObjectOwnerError = makeCustomError('NotObjectOwner',
    'NotObjectOwnerError',
    'unauthorized',
    '{{email}} does not have permission to modify');
