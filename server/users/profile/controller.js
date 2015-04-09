'use strict';
let Joi = require('joi');
let Users = require('./../model');
let ControllerFactory = require('./../../common/controller-factory');
let onlyOwnerAllowed = require('./../../common/prereqs/only-owner');
let addressSchema = Joi.object().keys({
    apartment: Joi.string(),
    floorHouseNo: Joi.string(),
    street: Joi.string(),
    landmark: Joi.string(),
    area: Joi.string(),
    city: Joi.string(),
    pincode: Joi.string(),
    state: Joi.string(),
    country: Joi.string()
});
var Controller = new ControllerFactory(Users)
    .updateController({
        payload: {
            profile: {
                firstName: Joi.string(),
                lastName: Joi.string(),
                preferredName: Joi.string(),
                title: Joi.string().valid(['Dr', 'Mr', 'Mrs', 'Ms']),
                dateOfBirth: Joi.date().format('YYYY-MM-DD'),
                addedPhone: Joi.array().items(Joi.string()),
                removedPhone: Joi.array().items(Joi.string()),
                residentialAddress: addressSchema,
                currentAddress: addressSchema,
                addedEducationalQualification: Joi.array().items(Joi.object().keys({
                    school: Joi.string(),
                    started: Joi.date().format('YYYY-MM-DD'),
                    completed: Joi.date().format('YYYY-MM-DD'),
                    qualification: Joi.string()
                })),
                removedEducationalQualification: Joi.array().items(Joi.object().keys({
                    school: Joi.string(),
                    started: Joi.date().format('YYYY-MM-DD'),
                    completed: Joi.date().format('YYYY-MM-DD'),
                    qualification: Joi.string()
                })),
                addedEmploymentHistory: Joi.array().items(Joi.object().keys({
                    company: Joi.string(),
                    designation: Joi.string(),
                    from: Joi.date().format('YYYY-MM-DD'),
                    to: Joi.date().format('YYYY-MM-DD')
                })),
                removedEmploymentHistory: Joi.array().items(Joi.object().keys({
                    company: Joi.string(),
                    designation: Joi.string(),
                    from: Joi.date().format('YYYY-MM-DD'),
                    to: Joi.date().format('YYYY-MM-DD')
                }))
            }
        }
    }, [
        onlyOwnerAllowed(Users, 'email')
    ], 'update',
    'updateProfile')
    .doneConfiguring();
module.exports = Controller;
