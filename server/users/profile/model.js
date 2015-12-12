'use strict';
const {build} = require('./../../common/dao');
const schemas = require('./schemas');
class Profile {
    static create() {
        return {
            firstName: '',
            lastName: '',
            preferredName: '',
            facebook: {},
            google: {},
            twitter: {}
        };
    }
    resetProfile() {
        this.profile = Profile.create();
        return this;
    }
}
build(Profile, schemas.dao, schemas.model);
module.exports = Profile;
