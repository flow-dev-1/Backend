const crypto = require("crypto")
const StatusCodes = require("../utils/status-codes");
const { validatePaystackPayment } = require("../utils/paystack");
const Payment = require("../models/payment");
const CourseEnrollment = require("../models/courseEnrollment");
const Course = require("../models/course");

exports.validatePaymentByCallback = async (req, res, next) => {
    const { reference } = req.query

    const payment = await Payment.findOne({ reference })

    if (!payment) return res.status(StatusCodes.BAD_REQUEST).json({
        status: "failed",
        message: "Operation Failed",
    });

    if (payment.status === "Confirmed") {
        return res.status(StatusCodes.CREATED).json({
            status: "success",
            message: "Payment Successfull!",
        });
    }

    const { data } = await validatePaystackPayment(reference);

    if (data?.status != "success") return res.status(StatusCodes.BAD_REQUEST).json({
        status: "failed",
        message: "Payment Failed",
    });

    payment.status = "Confirmed";
    payment.paymentDetails = data
    const enrollment = await CourseEnrollment.findById(payment.courseEnrollment)
    enrollment.status = "Confirmed"

    await Promise.all([
        Course.findByIdAndUpdate(enrollment.course, {
            $push: { courseEnrollment: enrollment._id }
        }),
        enrollment.save(),
        payment.save()
    ]);

    return res.status(StatusCodes.CREATED).json({
        status: "success",
        message: "Payment Successfull!",
    });

}

exports.validatePaymentByWebhook = async (req, res, next) => {

    try {
        const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');

        if (!req.headers['x-paystack-signature']) return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'failed', error: 'Un-authorized operation' });

        if (hash == req.headers['x-paystack-signature']) {
            // Retrieve the request's body
            const event = req.body;

            if (event.event == 'charge.success') {

                const data = await validatePaystackPayment(event.data.reference);

                if (!data.status) return res.status(StatusCodes.BAD_REQUEST).json({ status: 'failed', error: data.message });

                if (data.data.status !== 'success') return res.status(StatusCodes.BAD_REQUEST).json({ status: 'failed', error: 'Payment not completed' });

                const amount_paid = data.data.amount / 100;

                const payment = await Payment.findOne({ reference:data.data.reference });

                if (!payment) return res.status(StatusCodes.BAD_REQUEST).json({
                    status: "failed",
                    message: "Operation Failed",
                });
            
                if (payment.status === "Confirmed") {
                    // This is already handled in the callback
                    return res.status(StatusCodes.CREATED).json({
                        status: "success",
                        message: "Payment Successfull!",
                    });
                }

                // ToDo: confirm payment amount
                // if (payment.amount !== amount_paid) {
                //     return res.status(StatusCodes.BAD_REQUEST).json({
                //         status: "failed",
                //         message: "Payment amount mismatch",
                //         expected: payment.amount,
                //         received: amount_paid
                //     });
                // }

                payment.status = "Confirmed";
                payment.paymentDetails = data?.data || data
                const enrollment = await CourseEnrollment.findById(payment.courseEnrollment)
                enrollment.status = "Confirmed"
            
                await Promise.all([
                    Course.findByIdAndUpdate(enrollment.course, {
                        $push: { courseEnrollment: enrollment._id }
                    }),
                    enrollment.save(),
                    payment.save()
                ]);
            
                return res.status(StatusCodes.OK).json({
                    status: "success",
                    message: "Payment Successfull!",
                });
            }

        } else {

            return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'failed', error: 'Un-authorized operation' });
        }
        // res.send(200);
    } catch (error) {
        console.log(error)
    }

}

