const audit = require('./audit/validation');
const blogs = require('./blogs/validation');
const posts = require('./blogs/posts/validation');
const meals = require('./blogs/posts/meals/validation');
const recipes = require('./blogs/posts/recipes/validation');
const mealPlans = require('./meal-plans/validation');
const groceryList = require('./meal-plans/grocery-list/validation');
const userGroups = require('./user-groups/validation');
const users = require('./users/validation');
const session = require('./users/session/validation');
const authAttempts = require('./users/session/auth-attempts/validation');
const notifications = require('./users/notifications/validation');
const preferences = require('./users/preferences/validation');
const profile = require('./users/profile/validation');
const webContact = require('./web/contact/validation');
module.exports = {
    audit,
    blogs,
    posts,
    meals,
    recipes,
    mealPlans,
    groceryList,
    userGroups,
    users,
    session,
    authAttempts,
    notifications,
    preferences,
    profile,
    webContact
};
