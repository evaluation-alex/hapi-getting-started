'use strict';
import path from 'path';
import config from './../../config';
import {logAndBoom} from './../../common/utils';
import {sendEmail} from './../../common/plugins/mailer';
import schemas from './schemas';

export default {
    contact: {
        validate: schemas.controller.contact,
        handler(request, reply) {
            const options = {
                subject: config.projectName + ' contact form',
                to: config.system.toAddress,
                replyTo: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };
            sendEmail(options, path.join(__dirname, '/contact.hbs.md'), request.payload)
                .then(() => {
                    return {message: 'Success.'};
                })
                .catch(logAndBoom)
                .then(reply);
        }
    }
};
