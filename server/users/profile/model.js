'use strict';
import {build} from './../../common/dao';
import schemas from './schemas';
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
export default Profile;
