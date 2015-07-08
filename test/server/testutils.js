'use strict';
/*eslint-disable no-unused-expressions*/
let relativeTo = './../../';
let relativeToServer = relativeTo + 'server/';
let Bluebird = require('bluebird');
Bluebird.longStackTraces();
let server;
let serverBluebird = require('./server')(require(relativeToServer + 'config').manifest);
let _ = require('lodash');
let utils = require(relativeToServer + 'common/utils');
let Users = require(relativeToServer + 'users/model');
let UserGroups = require(relativeToServer + 'user-groups/model');
let Audit = require(relativeToServer + 'audit/model');
let Blogs = require(relativeToServer + 'blogs/model');
let Posts = require(relativeToServer + 'blogs/posts/model');
let AuthAttempts = require(relativeToServer + 'users/session/auth-attempts/model');
let Roles = require(relativeToServer + 'users/roles/model');
let Notifications = require(relativeToServer + 'users/notifications/model');
module.exports.authorizationHeader = (user) => 'Basic ' + (new Buffer(user.email + ':' + user.session[0].key)).toString('base64');
module.exports.authorizationHeader2 = (user, password) => 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
let setupRootRole = () => {
    return Roles.findOne({name: 'root', organisation: 'silver lining'})
        .then((found) =>
            found ? found : Roles.create('root', 'silver lining', [
                {action: 'update', object: '*'}, {action: 'view', object: '*'}
            ]));
};
let setupReadonlyRole = () => {
    return Roles.findOne({name: 'readonly', organisation: 'silver lining'})
        .then((found) =>
            found ? found : Roles.create('readonly', 'silver lining', [{action: 'view', object: '*'}]));
};
let setupRootUser = () => {
    return Users.findOne({email: 'root'})
        .then((found) =>
            found ? found.setRoles(['root'], 'testSetup').resetPrefs().resetProfile().save()
                : Users.create('root', 'silver lining', 'password123', 'en')
                .then((rt) => rt.setRoles(['root'], 'testSetup').save())
    );
};
let setupFirstUser = () => {
    return Users.findOne({email: 'one@first.com'})
        .then((found) =>
            found ? found.resetPrefs().resetProfile().save()
                : Users.create('one@first.com', 'silver lining', 'password', 'en')
    );
};
module.exports.setupRolesAndUsers = () => {
    return Bluebird.join(setupRootRole(), setupReadonlyRole(), setupRootUser(), setupFirstUser(), () => true);
};
module.exports.findAndLogin = (user, roles) => {
    return Users.findOne({email: user})
        .then((foundUser) => roles ? foundUser.setRoles(roles, 'test') : foundUser)
        .then((foundUser) => foundUser.loginSuccess('test', 'test').save())
        .then((loggedin) => {
            return {user: loggedin, authheader: module.exports.authorizationHeader(loggedin)};
        });
};
module.exports.setupServer = () => {
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
    utils.hasItems(notificationsToCleanup) ? Notifications.remove({
        $or: [
            {'title.1.title': {$in: notificationsToCleanup}},
            {'title.1.postTitle': {$in: notificationsToCleanup}},
            {'title.1.name': {$in: notificationsToCleanup}}
        ]
    }) : true;
});
module.exports.cleanupAudit = () => Audit.remove({});
module.exports.cleanupAuthAttempts = () => AuthAttempts.remove({});
module.exports.cleanupRoles = Bluebird.method((roles) =>
        utils.hasItems(roles) ? Roles.remove({name: {$in: roles}}) : true
);
module.exports.cleanup = (toClear, cb) => {
    Bluebird.join(cleanupUsers(toClear.users),
        cleanupUserGroups(toClear.userGroups),
        cleanupBlogs(toClear.blogs),
        cleanupPosts(toClear.posts),
        cleanupNotifications(toClear),
        module.exports.cleanupAudit(),
        module.exports.cleanupAuthAttempts(),
        () => {
            cb();
        })
        .catch((err) => {
            cb(err);
        })
        .done();
};
module.exports.testComplete = (notify, err) => {
    if (notify) {
        if (err) {
            notify(err);
        } else {
            notify();
        }
    }
};
