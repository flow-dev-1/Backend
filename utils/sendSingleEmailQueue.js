const Queue = require("bull");
const { school_course_invite } = require("./sendmail");
require("dotenv").config(); // Load environment variables

class SendEmailQueueService {
    otpEmailQueue;
    retries = 3; // 3 retries by default

    constructor() {
        this.otpEmailQueue = new Queue("Single_student_EMAIL_QUEUE", process.env.REDIS_URL, {
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

    addSendEmailJob(data) {
        this.otpEmailQueue.add(data, {
            attempts: this.retries,
            backoff: {
                type: "exponential",  // Exponential backoff
                delay: 5000,          // Start with a 5-second delay, doubles on each retry
            },

        });
    }

    async initiateProcessor(job) {
        console.log("Processing job:", job.id);
        console.log("Job data:", JSON.stringify(job.data, null, 2));

        console.log("Now we here")
        const {
            parentName,
            childName,
            status,
            grade,
            enrollment_id,
            school_name,
            course_name,
            email,
            token
        } = job.data;

        console.log(`Attempting to send email to: "${email}" for child: "${childName}"`);

        // Validate email before attempting to send
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            console.error(`Invalid email address: "${email}"`);
            throw new Error(`Job failed: Invalid email address "${email}"`);
        }

        // Attempt to send using MailTrap
        try {
            await school_course_invite(
                childName,
                status,
                grade,
                enrollment_id,
                school_name,
                course_name,
                email,
                token
            );
            console.log(`Email sent successfully to ${email} for course ${course_name}`);
            await job.log(`Email sent successfully to ${email} for course ${course_name}`);
        } catch (mailTrapError) {
            console.error(`Email sending failed to ${email}:`, mailTrapError);
            await job.log(`Email sending failed to ${email} for course ${course_name}`);
            throw new Error(`Job failed: Could not send email to ${email}. Error: ${mailTrapError.message}`);
        }
    }
}

module.exports = new SendEmailQueueService();

