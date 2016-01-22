const audit = require('./audit/validation');
const blogs = require('./blogs/validation');
const posts = require('./posts/validation');
const userGroups = require('./user-groups/validation');
const users = require('./users/validation');
const session = require('./session/validation');
const authAttempts = require('./auth-attempts/validation');
const notifications = require('./notifications/validation');
const preferences = require('./preferences/validation');
const profile = require('./profile/validation');
const webContact = require('./web/contact/validation');
module.exports = {
    audit,
    blogs,
    posts,
    userGroups,
    users,
    session,
    authAttempts,
    notifications,
    preferences,
    profile,
    webContact
};
