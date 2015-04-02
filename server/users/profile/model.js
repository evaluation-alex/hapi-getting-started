'use strict';
var Joi = require('joi');
var Properties = require('./../../common/mixins/properties');
var Update = require('./../../common/mixins/update');
var _ = require('lodash');
var Profile = function Profile () {
};
var addressSchema = Joi.object().keys({
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
Profile.schema = Joi.object().keys({
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
});
Profile.arrprops = [
    'profile.educationalQualifications',
    'profile.employmentHistory',
    'profile.phone'
];
_.extend(Profile.prototype, new Properties([
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
]));
_.extend(Profile.prototype, new Update([
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
], 'updateProfile'));
Profile.prototype.resetProfile = function resetProfileToDefault () {
    var self = this;
    self.profile = Profile.create();
    return self;
};
Profile.create = function create () {
    return {
        firstName: '',
        lastName: '',
        preferredName: '',
        title: '',
        dateOfBirth: new Date(1900, 1, 1),
        phone: [],
        permanentAddress: {
            apartment: '',
            floorHouseNo: '',
            street: '',
            landmark: '',
            area: '',
            city: '',
            pincode: '',
            state: '',
            country: ''
        },
        currentAddress: {
            apartment: '',
            floorHouseNo: '',
            street: '',
            landmark: '',
            area: '',
            city: '',
            pincode: '',
            state: '',
            country: ''
        },
        educationalQualification: [],
        employmentHistory: []
    };
};
module.exports = Profile;
