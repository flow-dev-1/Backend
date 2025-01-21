const Queue = require("bull");
const addStudentToCourseHelper = require("./addStudentToCourseHelper");
const { school_course_invite, sendProcessingReport } = require("./sendmail");
require("dotenv").config(); // Load environment variables

class EmailQueueService {
    otpEmailQueue;
    retries = 3; // 3 retries by default

    constructor() {
        this.otpEmailQueue = new Queue("Course_Invite_EMAIL_QUEUE", process.env.REDIS_URL, {
            settings: {
                // Set stallInterval to 0 to prevent any polling for stalled jobs
                stallInterval: 0,
            },
        });

        // Process jobs as soon as they are added to the queue
        this.otpEmailQueue.process((job) => this.initiateProcessor(job));

        // Queue connection error handling
        this.otpEmailQueue.on('error', (err) => {
            console.error("Queue error:", err);
        });
    }

    queue() {
        return this.otpEmailQueue;
    }

    addEmailJob(data) {
        this.otpEmailQueue.add(data, {
            attempts: this.retries,
            backoff: {
                type: "exponential",  // Exponential backoff
                delay: 5000,          // Start with a 5-second delay, doubles on each retry
            },

        });
    }

    async initiateProcessor(job) {
        const { stdClass, students, id, enrolledCourseId, user } = job.data;

        // addStudentTocourse()
        // Attempt to send using MailTrap
        try {
            const studentStatus = await addStudentToCourseHelper(stdClass, students, id, enrolledCourseId)

            await sendProcessingReport(user.email, studentStatus)
        } catch (mailTrapError) {
            console.error("Failed to send email using MailTrap. Error:", mailTrapError);
        }
    }
}

module.exports = new EmailQueueService();

