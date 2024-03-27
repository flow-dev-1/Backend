const Joi = require("joi");

exports.validate = (validator) => {
    return (req, res, next) => {
        const { error } = validator(req.body);
        if (error) return res.status(400).send(error.details[0].message);
        next();
    }
}

exports.loginValidator = function (req) {
    const schema = Joi.object({
        email: Joi.string()
            .min(5)
            .max(255)
            .required()
            .email(),
        password: Joi.string()
            .min(5)
            .max(255)
            .required(),
    })
    return schema.validate(req);
}

exports.courseEnrollmerntValidator = function (req) {
    const schema = Joi.object({
        first_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        last_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message('Please enter a valid phone number in international format')
            .required(),
        email: Joi.string()
            .min(5)
            .max(255)
            .required()
            .email(),
    })
    return schema.validate(req);
}