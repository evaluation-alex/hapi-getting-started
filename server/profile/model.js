'use strict';
const {build} = require('./../common/dao');
const schemas = require('./schemas');
const Profile = function Profile() {};
Profile.create = function create() {
    return {
        firstName: '',
        lastName: '',
        preferredName: '',
        facebook: {},
        google: {},
        twitter: {}
    };
};
Profile.prototype = {
    resetProfile() {
        this.profile = Profile.create();
        return this;
    }
};
module.exports = build(Profile, schemas.dao, schemas.model);
