'use strict';
let Joi = require('joi');
let ModelBuilder = require('./../../common/model-builder');
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
var Profile = (new ModelBuilder())
    .virtualModel(function Profile () {
    })
    .usingSchema(Joi.object().keys({
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
    }))
    .decorateWithUpdates([
        'profile.firstName',
        'profile.lastName',
        'profile.preferredName',
        'profile.title',
        'profile.dateOfBirth',
        'profile.firstName',
        'profile.lastName',
        'profile.preferredName',
        'profile.title',
        'profile.dateOfBirth',
        'profile.permanentAddress.apartment',
        'profile.permanentAddress.floorHouseNo',
        'profile.permanentAddress.street',
        'profile.permanentAddress.landmark',
        'profile.permanentAddress.area',
        'profile.permanentAddress.city',
        'profile.permanentAddress.pincode',
        'profile.permanentAddress.state',
        'profile.permanentAddress.country',
        'profile.currentAddress.apartment',
        'profile.currentAddress.floorHouseNo',
        'profile.currentAddress.street',
        'profile.currentAddress.landmark',
        'profile.currentAddress.area',
        'profile.currentAddress.city',
        'profile.currentAddress.pincode',
        'profile.currentAddress.state',
        'profile.currentAddress.country'
    ], [
        'profile.phone',
        'profile.educationalQualifications',
        'profile.employmentHistory'
    ], 'updateProfile')
    .doneConfiguring();
Profile.prototype.resetProfile = () => {
    let self = this;
    self.profile = Profile.create();
    return self;
};
Profile.create = () => {
    let emptyAddress = {
        apartment: '',
        floorHouseNo: '',
        street: '',
        landmark: '',
        area: '',
        city: '',
        pincode: '',
        state: '',
        country: ''
    };
    return {
        firstName: '',
        lastName: '',
        preferredName: '',
        title: '',
        dateOfBirth: new Date(1900, 1, 1),
        phone: [],
        permanentAddress: emptyAddress,
        currentAddress: emptyAddress,
        educationalQualification: [],
        employmentHistory: []
    };
};
module.exports = Profile;
