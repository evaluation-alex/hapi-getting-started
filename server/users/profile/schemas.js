'use strict';
let Joi = require('joi');
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
module.exports = {
    model: Joi.object().keys({
        firstName: Joi.string(),
        lastName: Joi.string(),
        preferredName: Joi.string(),
        title: Joi.string().valid(['Dr.', 'Mr.', 'Mrs.', 'Ms.']),
        dateOfBirth: Joi.date(),
        phone: Joi.array().items(Joi.string()),
        permanentAddress: addressSchema,
        currentAddress: addressSchema,
        educationalQualification: Joi.array().items(Joi.object().keys({
            school: Joi.string(),
            started: Joi.date(),
            completed: Joi.date(),
            qualification: Joi.string()
        })),
        employmentHistory: Joi.array().items(Joi.object().keys({
            company: Joi.string(),
            designation: Joi.string(),
            from: Joi.date(),
            to: Joi.date()
        }))
    }),
    update: {
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
    }
};