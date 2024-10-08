const axios = require('axios');
const { User } = require("../../models/user");
const SchoolCourseEnrollment = require("../../models/schoolCourseEnrollment");
const CourseEnrollment = require('../../models/courseEnrollment');
const { flow_course_reminder } = require('../sendmail');

const courseReminder = async () => {

    try {

        // Get the current day of the week (e.g., 'Monday', 'Tuesday', etc.)
        const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });

        const schoolCourseEnrollments = await SchoolCourseEnrollment.find({ dayOfWeek: currentDay })
            .select('_id course') // Select the _id and course fields
            .populate({
                path: 'course', // Populate the course field
                select: 'title' // Only select the title field from the Course model
            })
            .lean();

        // Iterate over each schoolCourseEnrollment to handle different course titles
        for (const enrollment of schoolCourseEnrollments) {
            const enrollmentId = enrollment._id;
            const courseTitle = enrollment.course?.title || "your course"; // Fallback if no title

            // Fetch all emails related to this particular schoolCourseEnrollment
            const emails = await CourseEnrollment.find({
                status: "Confirmed",
                schoolCourseEnrollment: enrollmentId,
            })
                .select('user')
                .populate({
                    path: 'user',
                    model: "User",
                    select: 'email', // Only select the email field
                    options: { lean: true }, // Return plain JavaScript objects
                });

            // Extract the emails for this particular enrollment
            // const emailList = emails.flatMap((enroll) => enroll.user?.email || []);
            const emailList = ["jossyojih@gmail.com","dev@flow.com"]

            // Send email for this specific course to the list of emails
            if (emailList.length > 0) {
                await flow_course_reminder(emailList, courseTitle); // Pass the email list and course title
                console.log(`Reminder sent for course: ${courseTitle}`);
            }
        }

    } catch (error) {
        console.log(error);
    }
};

module.exports = courseReminder