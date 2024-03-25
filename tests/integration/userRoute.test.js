const request = require("supertest");
const { User } = require("../../models/user");
const OTP = require("../../models/OTP");
const { Otp_VerifyAccount, Otp_ForgotPassword } = require("../../utils/sendmail");
const StatusCodes = require("../../utils/status-codes");
const bcrypt = require("bcrypt");

jest.mock("../../utils/sendmail"); // Mock the module
let server;
require("dotenv").config({ path: "test.env" });

const addUser = async () => {
    let user = new User({
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "+234123456789",
        gender: "male",
        age: 30,
        country: "USA",
        state: "NY",
        password: "password123",

    });
    user = await user.save();
    return user
}

describe("/api/users", () => {
    beforeEach(() => {
        server = require("../../app");
    });
    afterEach(async () => {
        server.close();
        await User.deleteMany({});
        await OTP.deleteMany({});
    });
    afterAll(async () => {
        server.close();
    });

    describe("GET /api/users/me", () => {
        it("should return logged-in user details without password", async () => {
            // Create a user for testing
            const user = new User({
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",
            });
            await user.save();

            // Generate authentication token for the user
            const token = user.generateAuthToken();

            // Make a request to the endpoint with the authentication token
            const response = await request(server)
                .get("/api/users/me")
                .set("Authorization", `Bearer ${token}`);

            // Check the response status code
            expect(response.statusCode).toBe(StatusCodes.OK);

            // Check if the response contains the user object
            expect(response.body).toHaveProperty("user");
            const returnedUser = response.body.user;

            // Check if the returned user object does not contain the password field
            expect(returnedUser).not.toHaveProperty("password");

            // Check if the returned user object matches the created user
            expect(returnedUser.first_name).toBe(user.first_name);
            expect(returnedUser.last_name).toBe(user.last_name);
            expect(returnedUser.email).toBe(user.email);
            // Add assertions for other user fields if necessary
        });

        it("should return 401 if no authentication token is provided", async () => {
            // Make a request to the endpoint without providing authentication token
            const response = await request(server)
                .get("/api/users/me");

            // Check the response status code
            expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
        });
    });

    // CREATE USER 👇👇👇👇👇

    describe("POST /register", () => {
        it("Should return an error if any required field is missing or unexpected field added", async () => {
            const userData = {
                isVerified: true
            };

            const response = await request(server)
                .post("/api/users/register")
                .send(userData);

            expect(response.statusCode).toBe(400);
        });

        it("should return response status 400 if user already exists and is verified", async () => {
            const user = new User({
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",
                isVerified: true
            });
            await user.save();

            const userData = {
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",
            };

            const response = await request(server)
                .post("/api/users/register")
                .send(userData);

            expect(response.statusCode).toBe(400);
        });

        it('should send an OTP to the user email if the user is not verified', async () => {
            let user = await addUser()

            const userData = {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone: '+12345678901',
                gender: 'male',
                age: 30,
                country: 'USA',
                state: 'NY',
                password: 'password123',
            };

            // Mock the email sending function
            Otp_VerifyAccount.mockResolvedValue();

            // Make the request to the endpoint
            const response = await request(server)
                .post('/api/users/register')
                .send(userData);

            // Fetch the user from the database
            user = await User.findOne({ email: userData.email });

            // Assert that an OTP is created and saved
            const otp = await OTP.findOne({ user: user._id, type: 'RegisterUser' });
            expect(otp).toBeTruthy();
            // Assert that the email is sent to the user
            expect(Otp_VerifyAccount).toHaveBeenCalled();
            expect(response.statusCode).toBe(200);
        });
        it("should register a new user and send OTP for verification", async () => {
            // Mock the Otp_VerifyAccount function
            Otp_VerifyAccount.mockResolvedValue();

            const userData = {
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",
            };

            // Make a request to register the user
            const response = await request(server)
                .post("/api/users/register")
                .send(userData);

            // Check the response status code
            expect(response.statusCode).toBe(StatusCodes.OK);

            // Check if the user is created in the database
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeTruthy();

            // Check if an OTP is generated and saved
            const otp = await OTP.findOne({ user: user._id, type: "RegisterUser" });
            expect(otp).toBeTruthy();

            // Check if the Otp_VerifyAccount function is called with the correct arguments
            expect(Otp_VerifyAccount).toHaveBeenCalledWith(userData.email, userData.first_name, expect.any(String));
        });

    });

    describe("PATCH /verify-account", () => {
        const data = {
            code: '123456'
        }
        it('should return response status 401 if client is not logged in', async () => {

            const response = await request(server)
                .patch('/api/users/verify-account')
                .send(data);

            expect(response.statusCode).toBe(401);
        });

        it('should return response status 400 if code is missing in request body', async () => {
            const token = new User().generateAuthToken();
            const response = await request(server)
                .patch('/api/users/verify-account')
                .set('authorization', `Bearer ${token}`)
                .send();

            expect(response.statusCode).toBe(400);
        });

        it('should return response status 400 if code is incorrect', async () => {
            let user = await addUser()
            const otp = new OTP({
                user: user._id,
                checkModel: "User",
                code: "123456",
                type: "RegisterUser",
                expiresIn: Date.now() + 3600000,
            })
            await otp.save();
            const token = user.generateAuthToken();
            const id = user._id;
            const response = await request(server)
                .patch('/api/users/verify-account')
                .set('authorization', `Bearer ${token}`)
                .send({ code: '12345' });

            expect(response.statusCode).toBe(400);
        });

        it('should return response status 200 if code is correct', async () => {
            let user = new User({
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",

            });
            user = await user.save();
            let otp = new OTP({
                user: user._id,
                checkModel: "User",
                code: "123456",
                type: "RegisterUser",
                expiresIn: Date.now() + 3600000,
            })
            await otp.save();
            const token = user.generateAuthToken();

            const response = await request(server)
                .patch('/api/users/verify-account')
                .set('authorization', `Bearer ${token}`)
                .send({ code: '123456' });

            // Check if the user is created in the database
            user = await User.findOne({ email: user.email, isVerified: true });
            expect(user).toBeTruthy();
            // Check the response status code
            expect(response.statusCode).toBe(StatusCodes.OK);
            // Check if an OTP is generated and saved
            otp = await OTP.findOne({ user: user._id, type: "RegisterUser" });
            expect(otp).toBeNull();
        });
    })

    describe("POST /login", () => {
        it("should return response status 400 if user email is missing", async () => {
            const userData = {
                password: "password123",
            };

            const response = await request(server)
                .post("/api/users/login")
                .send(userData);

            expect(response.statusCode).toBe(400);
        });

        it("should return response status 400 if user password is missing", async () => {
            const userData = {
                email: "john.doe@example.com",
            };

            const response = await request(server)
                .post("/api/users/login")
                .send(userData);

            expect(response.statusCode).toBe(400);
        });

        it("should return response status 400 if user is not found", async () => {
            const userData = {
                email: "nonexistentuser@example.com",
                password: "password123",
            };

            const response = await request(server)
                .post("/api/users/login")
                .send(userData);

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Invalid credentials.");
        });

        it("should return response status 400 if user is found but password is incorrect", async () => {
            const user = new User({
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",
                isVerified: true
            });
            await user.save();

            const userData = {
                email: "john.doe@example.com",
                password: "wrongpassword",
            };

            const response = await request(server)
                .post("/api/users/login")
                .send(userData);

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe("Invalid credentials.");
        });

        it("should return response status 200 if user is found and password is correct", async () => {
            const user = new User({
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: await bcrypt.hash('password123', 10),
                isVerified: true
            });
            await user.save();

            const userData = {
                email: "john.doe@example.com",
                password: "password123",
            };

            const response = await request(server)
                .post("/api/users/login")
                .send(userData);

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty("token");
        });
    });

    describe("POST /forgot-password", () => {
        it("should return an error if user is not found", async () => {
            const userData = {
                email: "nonexistent@example.com"
            };

            const response = await request(server)
                .post("/api/users/forgot-password")
                .send(userData);

            expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body).toEqual({ message: "User not found." });
        });

        it("should send OTP to user email for password reset if user is found and verified", async () => {
            const user = new User({
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",
                isVerified: true
            });
            await user.save();

            const userData = {
                email: "john.doe@example.com"
            };

            // Mock the email sending function
            Otp_ForgotPassword.mockResolvedValue();

            const response = await request(server)
                .post("/api/users/forgot-password")
                .send(userData);

            expect(response.statusCode).toBe(StatusCodes.OK);
            expect(response.body).toEqual({ message: "Please enter the code sent to your email." });
            // expect(response.body).toHaveProperty("token");
            // Check if an OTP is created and saved
            const otp = await OTP.findOne({ user: user._id, type: "ForgotPassword" });
            expect(otp).toBeTruthy();

            // Check if the email is sent to the user
            expect(Otp_ForgotPassword).toHaveBeenCalledWith(user.first_name, userData.email, expect.any(String), user.generateAuthToken());
        });
    });

    describe("POST /verify-token", () => {
        const data = {
            code: '123456'
        }
        it('should return response status 401 if client is not logged in', async () => {

            const response = await request(server)
                .post('/api/users/verify-token')
                .send(data);

            expect(response.statusCode).toBe(401);
        });

        it('should return response status 400 if code is missing in request body', async () => {
            const token = new User().generateAuthToken();
            const response = await request(server)
                .post('/api/users/verify-token')
                .set('authorization', `Bearer ${token}`)
                .send();

            expect(response.statusCode).toBe(400);
        });

        it('should return response status 400 if code is incorrect', async () => {
            let user = await addUser()
            const otp = new OTP({
                user: user._id,
                checkModel: "User",
                code: "123456",
                type: "ForgotPassword",
                expiresIn: Date.now() + 3600000,
            })
            await otp.save();
            const token = user.generateAuthToken();
            const response = await request(server)
                .post('/api/users/verify-token')
                .set('authorization', `Bearer ${token}`)
                .send({ code: '12345' });

            expect(response.statusCode).toBe(400);
        });

        it('should return response status 400 if user in token is incorrect', async () => {
            let user = await addUser()
            let wrongUser = new User({
                first_name: "John",
                last_name: "Doe",
                email: "j.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",

            });
            wrongUser = await wrongUser.save();
            const otp = new OTP({
                user: wrongUser._id,
                checkModel: "User",
                code: "123456",
                type: "ForgotPassword",
                expiresIn: Date.now() + 3600000,
            })
            await otp.save();
            const token = user.generateAuthToken();
            const response = await request(server)
                .post('/api/users/verify-token')
                .set('authorization', `Bearer ${token}`)
                .send({ code: '123456' });

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual({
                status: "failed",
                message: "Invalid User Credentials"
            });
        });

        it("should return an error if the OTP token is expired", async () => {
            let user = await addUser()
            const token = user.generateAuthToken();

            const otp = new OTP({
                user: user._id,
                checkModel: "User",
                code: "123456",
                type: "ForgotPassword",
                expiresIn: Date.now() - 3600000
            })
            await otp.save();

            const response = await request(server)
                .post('/api/users/verify-token')
                .set('authorization', `Bearer ${token}`)
                .send({ code: '123456' });


            expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body).toEqual({
                status: "failed",
                message: "Invalid or Expired Token."
            });
        });

        it("should verify the OTP token and update the user's resetPassword status", async () => {
            let user = await addUser()
            const token = user.generateAuthToken();

            const otp = new OTP({
                user: user._id,
                checkModel: "User",
                code: "123456",
                type: "ForgotPassword",
                expiresIn: Date.now() + 3600000
            })
            await otp.save();

            const response = await request(server)
                .post('/api/users/verify-token')
                .set('authorization', `Bearer ${token}`)
                .send({ code: '123456' });

            expect(response.statusCode).toBe(StatusCodes.OK);
            expect(response.body).toEqual({
                status: "success",
                message: "OTP verified, You can now reset Password"
            });

            // Check if the user's resetPassword status is updated
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.resetPassword).toBe(true);

            // Check if the OTP is deleted from the database
            const otpCheck = await OTP.findOne({ code: "123456" });
            expect(otpCheck).toBeNull();
        });

    });

    describe("PUT /password", () => {

        it('should return response status 401 if client does not have auth token', async () => {
            const data = {
                password: "new_password"
            };
            const response = await request(server)
                .put('/api/users/password')
                .send(data);

            expect(response.statusCode).toBe(401);
        });

        it("should return an error if user is not authorized to reset password", async () => {
            const userData = {
                password: "new_password"
            };

            const response = await request(server)
                .put("/api/users/password")
                .set('authorization', `Bearer ${new User().generateAuthToken()}`)
                .send(userData);

            expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body).toEqual({
                status: "failed",
                error: "Invalid credentials"
            });
        });

        it("should reset user's password and update resetPassword status", async () => {
            let user = new User({
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                phone: "+234123456789",
                gender: "male",
                age: 30,
                country: "USA",
                state: "NY",
                password: "password123",
                resetPassword: true
            });
            user = await user.save();

            const newPassword = "new_password";

            const userData = {
                password: newPassword
            };

            const response = await request(server)
                .put("/api/users/password")
                .set("Authorization", `Bearer ${user.generateAuthToken()}`)
                .send(userData);

            expect(response.statusCode).toBe(StatusCodes.OK);
            expect(response.body).toEqual({
                status: "success",
                message: "You have successfully reset your password"
            });

            // Check if the user's password is updated
            const updatedUser = await User.findById(user._id);
            const passwordMatch = await bcrypt.compare(newPassword, updatedUser.password);
            expect(passwordMatch).toBe(true);

            // Check if the resetPassword status is updated
            expect(updatedUser.resetPassword).toBe(false);
        });
    });


})