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

exports.inviteAdminValidator = function (req) {
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


exports.registerAdminValidator = function (req) {

    const schema = Joi.object({
        email: Joi.string()
            .min(5)
            .max(255)
            .required()
            .email(),
        password: Joi.string()
            .min(8)
            .max(1024)
            .required(),

    })
    return schema.validate(req);
}

function validateAdminUpdate(req) {

    const schema = Joi.object({
        first_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        age: Joi.number()
            .min(18)
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
        // password: Joi.string()
        //     .min(8)
        //     .max(1024)
        //     .required(),
        age: Joi.number()
            .min(3)
            .max(100)
            .required(),
        gender: Joi.string()
            .valid('male', 'female')
            .required(),
        country: Joi.string()
            .min(2)
            .max(255)
            .required(),
        state: Joi.string()
            .min(2)
            .max(255)
            .required()
    })
    return schema.validate(user);
}

exports.createCourseValidator = function (req) {

    const schema = Joi.object({
        title: Joi.string()
            .min(3)
            .max(255)
            .required(),
        description: Joi.string()
            .min(8)
            .required(),
        cost: Joi.number()
            .min(0)
            .required(),
        currency: Joi.string()
            .min(3)
            .required(),
        status: Joi.string()
            .min(3)
            .max(255)
            .required(),
        access: Joi.string()
            .min(3)
            .max(255)
            .required(),
        url: Joi.string()
            .min(8)
            .required()

    })
    return schema.validate(req);
}


