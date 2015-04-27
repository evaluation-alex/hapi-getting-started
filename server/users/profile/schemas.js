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
let educationalQualifactionSchema = Joi.object().keys({
    school: Joi.string(),
    started: Joi.date(),
    completed: Joi.date(),
    qualification: Joi.string()
});
let employmentHistorySchema = Joi.object().keys({
    company: Joi.string(),
    designation: Joi.string(),
    from: Joi.date(),
    to: Joi.date()
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
        educationalQualification: Joi.array().items(educationalQualifactionSchema),
        employmentHistory: Joi.array().items(employmentHistorySchema)
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
                addedEducationalQualification: Joi.array().items(educationalQualifactionSchema),
                removedEducationalQualification: Joi.array().items(educationalQualifactionSchema),
                addedEmploymentHistory: Joi.array().items(employmentHistorySchema),
                removedEmploymentHistory: Joi.array().items(employmentHistorySchema)
            }
        }
    }
};