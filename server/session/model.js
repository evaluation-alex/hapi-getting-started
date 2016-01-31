'use strict';
const _ = require('./../lodash');
const {remove, find, omit, pick, merge} = _;
const Uuid = require('node-uuid');
const moment = require('moment');
const secureHash = require('./../common/utils').secureHash;
const build = require('./../common/dao').build;
const schemas = require('./schemas');
/*istanbul ignore next*/
const Session = function Session() {};
Session.prototype = {
    _invalidateSession(ipaddress, by) {
        const removed = remove(this.session, session => session.ipaddress === ipaddress);
        this.trackChanges('user.session', removed, null, by);
        return this;
    },
    _newSession(ipaddress, by) {
        const session = {
            ipaddress,
            key: secureHash(Uuid.v4().toString()),
            expires: moment().add(1, 'month').toDate()
        };
        this.session.push(session);
        this.trackChanges('user.session', null, session, by);
        return this;
    },
    loginSuccess(ipaddress, by) {
        const found = find(this.session, session => session.ipaddress === ipaddress);
        if (!found) {
            this._newSession(ipaddress, by);
        } else {
            if (moment().isAfter(found.expires)) {
                this._invalidateSession(ipaddress, by);
                this._newSession(ipaddress, by);
            }
        }
        return this;
    },
    afterLogin(ipaddress) {
        const session = find(this.session, sesion => sesion.ipaddress === ipaddress);
        return merge({},
            {user: this.email},
            pick(this, ['_id', 'organisation', 'preferences', 'profile']),
            {session: omit(session, ['key'])},
            {authHeader: `Basic ${new Buffer(`${this.email}:${session.key}`).toString('base64')}`}
        );
    },
    loginFail(ipaddress, by) {
        return this.trackChanges('login fail', null, ipaddress, by);
    },
    logout(ipaddress, by) {
        this._invalidateSession(ipaddress, by);
        return this;
    }
};
module.exports = build(Session, schemas.dao, schemas.model);
