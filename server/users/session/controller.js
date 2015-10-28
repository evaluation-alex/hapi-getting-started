'use strict';
import {ip, logAndBoom} from './../../common/utils';
import {abuseDetected} from './../../common/prereqs';
import Users from './../model';
import AuthAttempts from './auth-attempts/model';
import schemas from './schemas';
export default {
    login: {
        validate: schemas.controller.login,
        pre: [
            abuseDetected()
        ],
        handler(request, reply) {
            const {email, password} = request.payload;
            const ipadrs = ip(request);
            reply(
                Users.findByCredentials(email, password)
                .then(user => user.loginSuccess(ipadrs, user.email).save())
                .then(user => user.afterLogin(ipadrs))
                .catch(err => {
                    AuthAttempts.create(ipadrs, email);
                    return logAndBoom(err);
                })
            );
        }
    },
    logout: {
        handler(request, reply) {
            let user = request.auth.credentials.user;
            reply(
                user.logout(ip(request), user.email).save()
                .then(() => {
                    return {message: 'Success.'};
                })
            );
        }
    }
};
