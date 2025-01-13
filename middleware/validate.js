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
        usernameOrEmail: Joi.string().min(5).max(255).required().messages({
            "string.min": "Username or Email must be at least 5 characters long.",
            "string.max": "Username or Email cannot exceed 255 characters.",
            "any.required": "Username or Email is required.",
        }),
        password: Joi.string().min(5).max(255).required().messages({
            "string.min": "Password must be at least 5 characters long.",
            "string.max": "Password cannot exceed 255 characters.",
            "any.required": "Password is required.",
        }),
    });

    return schema.validate(req);
};

exports.courseEnrollmerntValidator = function (req) {
    const schema = Joi.object({
        fullName: Joi.string()
            .min(2)
            .max(300)
            .required()
            .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
            .message(
                "Full name must contain at least a first name and a last name separated by a space."
            ),
        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message("Please enter a valid phone number in international format")
            .required(),
        email: Joi.string().min(5).max(255).required().email(),
    });
    return schema.validate(req);
}

exports.inviteAdminValidator = function (req) {
    const schema = Joi.object({
        fullName: Joi.string()
            .min(2)
            .max(300)
            .required()
            .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
            .message(
                "Full name must contain at least a first name and a last name separated by a space."
            ),
        position: Joi.string().required(),
        email: Joi.string().min(5).max(255).required().email(),
    });
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

exports.validateAdminUpdate = function validateAdminUpdate(req) {

    const schema = Joi.object({
        first_name: Joi.string()
            .min(2)
            .max(300)
            .required()
            .pattern(/^[a-zA-Z]+$/)
            .message("First name must contain only letters."),
        last_name: Joi.string()
            .min(2)
            .max(300)
            .required()
            .pattern(/^[a-zA-Z]+$/)
            .message("Last name must contain only letters."),

        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message("Please enter a valid phone number in international format")
            .required(),
        email: Joi.string().min(5).max(255).required().email(),

        gender: Joi.string().valid("male", "female").required(),
        country: Joi.string().min(2).max(255).required(),
        state: Joi.string().min(2).max(255).required(),
        address: Joi.string().min(2).max(1024).required(),
    });
    return schema.validate(req);
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
        grade: Joi.string()
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

exports.registerSchoolValidator = function (req) {

    const schema = Joi.object({
        school_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        contact_name: Joi.string()
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
        password: Joi.string()
            .min(8)
            .max(1024)
            .required(),
        grade: Joi.string()
            .min(2)
            .max(255)
            .required(),
        country: Joi.string()
            .min(2)
            .max(255)
            .required(),
        state: Joi.string()
            .min(2)
            .max(255)
            .required(),

        lga: Joi.string()
            .optional(),
        address: Joi.string()
            .min(2)
            .max(2020)
            .required(),
    })
    return schema.validate(req);
}


exports.updateSchoolValidator = function (req) {

    const schema = Joi.object({
        school_name: Joi.string()
            .min(2)
            .max(100)
            .optional(),
        contact_name: Joi.string()
            .min(2)
            .max(100)
            .optional(),
        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message('Please enter a valid phone number in international format')
            .optional(),
        email: Joi.string()
            .min(5)
            .max(255)
            .email()
            .optional(),
        address: Joi.string()
            .min(2)
            .max(2020)
            .optional(),
    })
    return schema.validate(req);
}

exports.schoolCourseEnrollmentValidator = function (req) {

    const studentSchema = Joi.object({

        email: Joi.string().email().required(),
        guardianFullName: Joi.string().min(2).max(100).required(), // Example additional field
        fullName: Joi.string().min(2).max(100).required(), // Example additional field
    });

    const schema = Joi.object({
        stdClass: Joi.string()
            .min(2)
            .max(100)
            .required(),
        dayOfWeek: Joi.string()
            .min(2)
            .max(100)
            .required(),
        startTime: Joi.string()
            .required()
            .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), // Validate time format "HH:mm"
        endTime: Joi.string()
            .required()
            .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/), // Validate time format "HH:mm"
        students: Joi.array()
            .items(studentSchema)
            .required(),
    });

    return schema.validate(req);
};

exports.schoolCourseAddStudentsValidator = function (req) {
    const studentSchema = Joi.object({

        email: Joi.string().email().required(),
        guardianFullName: Joi.string().min(2).max(100).required(), // Example additional field
        fullName: Joi.string().min(2).max(100).required(), // Example additional field
    });
    const schema = Joi.object({
        stdClass: Joi.string()
            .min(2)
            .max(100)
            .required(),
        students: Joi.array()
            .items(studentSchema)
            .required(),
    });

    return schema.validate(req);
};

exports.schoolCourseAddTeachersValidator = function (req) {
  const studentSchema = Joi.object({
    email: Joi.string().email().required(),
    fullName: Joi.string().min(2).max(100).required(), // Example additional field
  });
  const schema = Joi.object({
    stdClass: Joi.string().min(2).max(100).required(),
    educators: Joi.array().items(studentSchema).required(),
  });

  return schema.validate(req);
};

exports.courseSubmissionValidator = function (req) {
    const schema = Joi.object({
        course: Joi.string()
        .optional(),
        courseEnrollmentId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/) // Validates MongoDB ObjectId format
            .required(),
        week: Joi.number()
            .positive()
            .required(),
        activities: Joi.array()
            .min(1) // Ensures the array is not empty
            .required(),
        assessments: Joi.array()
            .min(1) // Ensures the array is not empty
            .required(),
    });

    return schema.validate(req);
};
