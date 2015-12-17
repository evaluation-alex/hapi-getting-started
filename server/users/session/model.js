'use strict';
const {remove, find, omit} = require('lodash');
const Uuid = require('node-uuid');
const moment = require('moment');
const {secureHash} = require('./../../common/utils');
const {build} = require('./../../common/dao');
const schemas = require('./schemas');
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
        return {
            _id: this._id,
            user: this.email,
            session: omit(session, 'key'),
            authHeader: `Basic ${new Buffer(`${this.email}:${session.key}`).toString('base64')}`,
            preferences: this.preferences
        };
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
