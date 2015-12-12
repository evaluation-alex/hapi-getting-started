'use strict';
const Joi = require('joi');
const ingredientsSchema = Joi.object().keys({
    name: Joi.string(),
    quantity: Joi.number(),
    units: Joi.string().only('gm', 'kg', 'ml', 'tbsp', 'units'),
    type: Joi.string().only('fruit', 'vegetable', 'spice', 'white meat', 'red meat', 'pulses', 'grains', 'herbs')
});
module.exports = {
    ingredients: ingredientsSchema,
    controller: {
        create: {
            payload: {
                email: Joi.string(),
                fromDate: Joi.date().format('YYYY-MM-DD'),
                toDate: Joi.date().format('YYYY-MM-DD'),
                ingredients: Joi.array().items(ingredientsSchema)
            }
        },
        find: {
            query: {
                isActive: Joi.string(),
                date: Joi.date().format('YYYY-MM-DD')
            }
        },
        update: {
            payload: {
                addedIngredients: Joi.array().items(ingredientsSchema),
                removedIngredients: Joi.array().items(ingredientsSchema)
            }
        },
        makeGroceryList: {
            payload: {
                dateBefore: Joi.date().format('YYYY-MM-DD'),
                dateAfter: Joi.date().format('YYYY-MM-DD')
            }
        }
    }
};
