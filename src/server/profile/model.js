'use strict';
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), require('./../lodash')).profile;
const daoOptions = {
    isVirtualModel: true,
    updateMethod: {
        method: 'updateProfile',
        props: [
            'profile.firstName',
            'profile.lastName',
            'profile.preferredName',
            'profile.facebook',
            'profile.google',
            'profile.twitter'
        ]
    },
    schemaVersion: 1
};
/*istanbul ignore next*/
const Profile = function Profile() {};
Profile.create = function create() {
    return {
        firstName: '.',
        lastName: '.',
        preferredName: '.',
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
module.exports = build(Profile, daoOptions, modelSchema);
