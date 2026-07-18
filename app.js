const winston = require("winston");
const express = require("express");
const morgan = require('morgan');
const cron = require('node-cron');
const courseReminder = require("./utils/cronJobs/courseReminder.js");

const Queue = require("bull");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const emailService = require("./utils/emailQueue.js");
const sendStudentEmailService = require("./utils/sendSingleEmailQueue.js");
const queueDashboardAuth = require("./middleware/queueDashboardAuth.js");
const {
    getActivityFeedbackQueueService
} = require("./utils/aiFeedback/queue");


require('dotenv').config();
require("./startup/logging")();


const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// Specify all queues here
const activityFeedbackQueueService = getActivityFeedbackQueueService();
const allQueues = [
    emailService.queue(),
    sendStudentEmailService.queue(),
    activityFeedbackQueueService.queue
];

const QUEUE_LIST = allQueues.map((queue) => new BullAdapter(queue));

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: QUEUE_LIST,
    serverAdapter: serverAdapter,
});

const app = express();

app.use(morgan('tiny'));

require("./startup/cors.js")(app);
require("./startup/db")();

cron.schedule('0 12 * * *', () => {
    console.log("Running at 12:00 PM every day");
    courseReminder();
});

// cron.schedule('*/10 * * * *', () => {
//     console.log("Running every 10 minutes");
//     welcome_new_user(
//         "Jossy",
//         "FLS1234",
//         "jossyojih@gmail.com"
//     );
// });

require("./startup/routes")(app);
app.use("/admin/queues", queueDashboardAuth, serverAdapter.getRouter());

// require("./startup/validation")();

const port = process.env.PORT;

const server = app.listen(port, () =>
    winston.info(`Listening on port ${port}...`)
);
module.exports = server;
