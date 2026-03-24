const request = require('supertest');
const StatusCodes = require('../../utils/status-codes');
require('dotenv').config({ path: 'test.env' });
let server;

describe('/api/excel-upload', () => {
    jest.setTimeout(60000); // 60s timeout for remote DB operations
    beforeEach(async () => {
        if (!process.env.PORT) process.env.PORT = 5002;
        server = require('../../app');
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve) => mongoose.connection.once('open', resolve));
        }
    });

    afterEach(() => {
        server.close();
    });

    it('should return 400 if no file is uploaded', async () => {
        const res = await request(server).post('/api/excel-upload');
        expect(res.status).toBe(StatusCodes.BAD_REQUEST);
        expect(res.body.message).toBe('No file uploaded');
    });

    it('should successfully enroll a new user from Excel', async () => {
        const { User } = require('../../models/user');
        const CourseEnrollment = require('../../models/courseEnrollment');
        const { Parents } = require('../../models/parentGuardian');

        const email = 'test_enroll@example.com';
        const name = 'Test Enrollment User';

        const XLSX = require('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([['name', 'email', 'tag'], [name, email, 'GE']]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const res = await request(server)
            .post('/api/excel-upload')
            .attach('file', buffer, 'test.xlsx');

        if (res.status !== StatusCodes.OK) {
            console.error("Test Failure Response:", JSON.stringify(res.body, null, 2));
        }

        expect(res.status).toBe(StatusCodes.OK);
        expect(res.body.summary.total).toBe(1);
        expect(res.body.summary.created + res.body.summary.updated).toBe(1);

        // Verify database state
        const user = await User.findOne({ email });
        expect(user).toBeDefined();
        expect(user.fullName).toBe(name);
        expect(user.isVerified).toBe(true);
        expect(user.grade).toBe('Secondary');

        const parent = await Parents.findOne({ email });
        expect(parent).toBeDefined();
        expect(parent.students).toContainEqual(user._id);

        const enrollment = await CourseEnrollment.findOne({ user: user._id });
        expect(enrollment).toBeDefined();
        expect(enrollment.status).toBe('Confirmed');

        // Cleanup
        await User.deleteOne({ _id: user._id });
        await CourseEnrollment.deleteMany({ user: user._id });
        await Parents.deleteOne({ email });
    });

    it('should return 500 (multer error) if an invalid file type is uploaded', async () => {
        const res = await request(server)
            .post('/api/excel-upload')
            .attach('file', Buffer.from('dummy content'), 'test.txt');

        // Multer throws an error which might bubble up to our error middleware
        // Our error middleware usually returns a 500 if not handled specifically as a Joi or other known error
        expect(res.status).toBe(500);
    });
});
