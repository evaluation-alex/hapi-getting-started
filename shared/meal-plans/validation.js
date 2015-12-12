'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        create: {
            payload: {
                date: Joi.date().format('YYYY-MM-DD').required(),
                mealId: Joi.string(),
                noOfPeople: Joi.number(),
                mealType: Joi.string().only('breakfast', 'brunch', 'lunch', 'snack', 'dinner', 'drinks')
            }
        },
        find: {
            query: {
                email: Joi.string(),
                mealType: Joi.string(),
                dateBefore: Joi.date().format('YYYY-MM-DD'),
                dateAfter: Joi.date().format('YYYY-MM-DD'),
                isActive: Joi.string()
            }
        },
        update: {
            payload: {
                isActive: Joi.boolean(),
                mealId: Joi.string(),
                noOfPeople: Joi.number(),
                mealType: Joi.string().only('breakfast', 'brunch', 'lunch', 'snack', 'dinner', 'drinks')
            }
        },
        plan: {
            query: {
                title: Joi.array().items(Joi.string()),
                blogId: Joi.array().items(Joi.string()),
                tag: Joi.array().items(Joi.string()),
                category: Joi.array().items(Joi.string()),
                description: Joi.array().items(Joi.string()),
                ingredients: Joi.array().items(Joi.string()),
                mealType: Joi.array().items(Joi.string()),
                publishedBy: Joi.string(),
                publishedOnBefore: Joi.date().format('YYYY-MM-DD'),
                publishedOnAfter: Joi.date().format('YYYY-MM-DD')
            },
            noOfPeople: Joi.number().default(1),
            mealTypes: Joi.array().items(Joi.string().only('breakfast', 'lunch', 'dinner')),
            from: Joi.date().format('YYYY-MM-DD'),
            until: Joi.date().format('YYYY-MM-DD')
        }
    }
};
