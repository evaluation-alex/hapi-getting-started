'use strict';
import Bluebird from 'bluebird';
import config from './../../../config';
import {build} from './../../../common/dao';
import schemas from './schemas';
const {authAttempts: limits} = config;
class AuthAttempts {
    constructor(attrs) {
        this.init(attrs);
    }

    static create(ip, email) {
        return AuthAttempts.upsert({
            ip,
            email,
            organisation: '*',
            time: new Date()
        });
    }

    static abuseDetected(ip, email) {
        return Bluebird.join(
            AuthAttempts.count({ip}),
            AuthAttempts.count({ip, email}),
            (attemptsFromIp, attemptsFromIpUser) => {
                return attemptsFromIp >= limits.forIp || attemptsFromIpUser >= limits.forIpAndUser;
            });
    }
}
build(AuthAttempts, schemas.dao, schemas.model);
export default AuthAttempts;
