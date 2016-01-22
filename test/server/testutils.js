'use strict';
/*eslint-disable no-unused-expressions*/
let Bluebird = require('bluebird');
Bluebird.longStackTraces();
let server;
let serverBluebird = require('./server')();
let _ = require('lodash');
let utils = require('./../../build/common/utils');
let Users = require('./../../build/users/model');
let UserGroups = require('./../../build/user-groups/model');
let Audit = require('./../../build/audit/model');
let Blogs = require('./../../build/blogs/model');
let Posts = require('./../../build/posts/model');
let AuthAttempts = require('./../../build/auth-attempts/model');
let Roles = require('./../../build/roles/model');
let Notifications = require('./../../build/notifications/model');
module.exports.authorizationHeader = function authorizationHeader(user) {
    return 'Basic ' + (new Buffer(user.email + ':' + user.session[0].key)).toString('base64');
};
module.exports.authorizationHeader2 = function authorizationHeader2(user, password) {
    return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
};
function setupRootRole() {
    return Roles.findOne({name: 'root', organisation: 'silver lining'})
        .then((found) =>
            found ? found : Roles.create('root', 'silver lining', [
                {action: 'update', object: '*'}, {action: 'view', object: '*'}
            ]));
}
function setupReadonlyRole() {
    return Roles.findOne({name: 'readonly', organisation: 'silver lining'})
        .then((found) =>
            found ? found : Roles.create('readonly', 'silver lining', [{action: 'view', object: '*'}]));
}
function setupRootUser() {
    return Users.findOne({email: 'root'})
        .then((found) =>
            found ? found.setRoles(['root'], 'testSetup').resetPrefs().resetProfile().save()
                : Users.create('root', 'silver lining', 'password123', 'en')
                .then((rt) => rt.setRoles(['root'], 'testSetup').save())
    );
}
function setupFirstUser() {
    return Users.findOne({email: 'one@first.com'})
        .then((found) =>
            found ? found.resetPrefs().resetProfile().save()
                : Users.create('one@first.com', 'silver lining', 'password', 'en')
    );
}
module.exports.setupRolesAndUsers =  function setupRolesAndUsers() {
    return Bluebird.join(setupRootRole(), setupReadonlyRole(), setupRootUser(), setupFirstUser(), () => true);
};
module.exports.findAndLogin = function findAndLogin(user, roles) {
    return Users.findOne({email: user})
        .then((foundUser) => roles ? foundUser.setRoles(roles, 'test') : foundUser)
        .then((foundUser) => foundUser.loginSuccess('127.0.0.1', 'test').save())
        .then((loggedin) => {
            return {user: loggedin, authheader: module.exports.authorizationHeader(loggedin)};
        });
};
module.exports.setupServer = function setupServer() {
    return serverBluebird
        .then((server1) => {
            server = server1;
        })
        .then(module.exports.setupRolesAndUsers)
        .then(() => module.exports.findAndLogin('root'))
        .then((foundUser) => {
            if (!server) {
                throw new Error('server not ready');
            } else {
                return {server: server, authheader: foundUser.authheader};
            }
        });
};
let cleanupUsers = Bluebird.method((usersToCleanup) =>
        utils.hasItems(usersToCleanup) ? Users.remove({email: {$in: usersToCleanup}}) : true
);
let cleanupUserGroups = Bluebird.method((groupsToCleanup) =>
        utils.hasItems(groupsToCleanup) ? UserGroups.remove({name: {$in: groupsToCleanup}}) : true
);
let cleanupBlogs = Bluebird.method((blogsToCleanup) =>
        utils.hasItems(blogsToCleanup) ? Blogs.remove({title: {$in: blogsToCleanup}}) : true
);
let cleanupPosts = Bluebird.method((postsToCleanup) =>
        utils.hasItems(postsToCleanup) ? Posts.remove({title: {$in: postsToCleanup}}) : true
);
let cleanupNotifications = Bluebird.method((toClear) => {
    let notificationsToCleanup = _.flatten(_.map(['userGroups', 'blogs', 'posts'], (a) => _.map(toClear[a], (i) => new RegExp(i, 'g'))));
    return utils.hasItems(notificationsToCleanup) ? Notifications.remove({
        $or: [
            {'title.1.title': {$in: notificationsToCleanup}},
            {'title.1.postTitle': {$in: notificationsToCleanup}},
            {'title.1.name': {$in: notificationsToCleanup}}
        ]
    }) : true;
});
let cleanupNotifications2 = Bluebird.method((notificationsToCleanup) =>
        utils.hasItems(notificationsToCleanup) ? Notifications.remove({title: {$in: notificationsToCleanup}}) : true
);
module.exports.cleanupAudit = function cleanupAudit() {
    return Audit.remove({});
};
module.exports.cleanupAuthAttempts = function cleanupAuthAttempts() {
    return AuthAttempts.remove({});
};
let cleanupRoles = Bluebird.method((roles) =>
        utils.hasItems(roles) ? Roles.remove({name: {$in: roles}}) : true
);
module.exports.cleanup = function cleanup(toClear, cb) {
    Bluebird.join(cleanupUsers(toClear.users),
        cleanupUserGroups(toClear.userGroups),
        cleanupBlogs(toClear.blogs),
        cleanupPosts(toClear.posts),
        cleanupNotifications(toClear),
        cleanupNotifications2(toClear.notifications),
        cleanupRoles(toClear.roles),
        module.exports.cleanupAudit(),
        module.exports.cleanupAuthAttempts(),
        () => {
            cb();
        })
        .catch(cb)
        .done();
};
module.exports.testComplete = function testComplete(notify, err) {
    if (notify) {
        if (err) {
            notify(err);
        } else {
            notify();
        }
    }
};
