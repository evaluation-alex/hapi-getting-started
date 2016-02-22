'use strict';
module.exports = function (Joi) {
    return {
        controller: {
            find: {
                query: {
                    by: Joi.string(),
                    objectType: Joi.string(),
                    objectChangedId: Joi.string(),
                    onBefore: Joi.date().format('YYYY-MM-DD'),
                    onAfter: Joi.date().format('YYYY-MM-DD')
                }
            }
        }
    };
};
