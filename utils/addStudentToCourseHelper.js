
const SchoolCourses = require("../models/schoolCourseEnrollment");
const { Parents } = require("../models/parentGuardian");
const { User } = require("../models/user");
const StudentEnrollments = require("../models/courseEnrollment");
const { school_course_invite } = require("./sendmail");
const mongoose = require("mongoose");
const StatusCodes = require("./status-codes");
const generateId = require("./generateId");
const school = require("../models/school");
const sendSingleEmailQueue = require("../utils/sendSingleEmailQueue");

module.exports = addStudentTocourse = async (stdClass, classTag, students, id, enrolledCourseId) => {
    const existingEnrollment = await SchoolCourses.findOne({
        _id: enrolledCourseId,
    })
        .populate("course", "title")
        .populate("school", "school_name");

    if (!existingEnrollment) {
        return res
            .status(StatusCodes.UNPROCESSABLE_ENTITY)
            .json({ message: "You are not enrolled in this course!" });
    }

    const result = []; // Array to store student processing status

    for (const item of students) {

        try {

            // Keep track of each student.
            // This will be used to plot a table that will be sent to the user about their status
            const studentStatus = {
                fullName: item.fullName,
                email: item.email,
                status: "Failed", // Default status; will be updated upon success
            };
            // Check if this parent exists
            const existingParent = await Parents.findOne({
                email: item.email,
            }).populate("students", "-password");

            // if parent does not exist it means d child is new
            if (!existingParent) {
                // Create new parent and student
                const newParent = new Parents({
                    fullName: item.guardianFullName,
                    email: item.email,
                    phone: "",
                    country: "",
                    state: "",
                    students: [],
                });

                const userId = generateId();

                const newUser = new User({
                    _id: new mongoose.Types.ObjectId(),
                    userId,
                    fullName: item?.fullName,
                    guardianFullName: item.guardianFullName,
                    email: item.email,
                    userType: "School",
                    grade: stdClass.startsWith("Pri")
                        ? "Primary"
                        : stdClass.startsWith("Year")
                            ? "Secondary"
                            : "Educator",
                    newCourseInvite: {
                        school: id,
                    },
                });

                const newStudentEnrollment = new StudentEnrollments({
                    _id: new mongoose.Types.ObjectId(),
                    course: existingEnrollment.course._id,
                    school: id,
                    checkModel: "User",
                    schoolCourseEnrollment: existingEnrollment._id,
                    user: newUser._id,
                    stdClass,
                    classTag
                });

                existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);

                newParent.students = [newUser._id];

                const token = newUser.generateAuthToken();

                await Promise.all([newStudentEnrollment.save(), newUser.save(), newParent.save()]);

                let stdGrade = stdClass.startsWith("Pri")
                    ? "Primary"
                    : stdClass.startsWith("Year")
                        ? "Secondary"
                        : "Educator";

                sendSingleEmailQueue.addSendEmailJob({
                    parentName: item?.guardianFullName,
                    childName: item?.fullName,
                    status: "new",
                    grade: stdGrade,
                    enrollment_id: newStudentEnrollment?._id,
                    school_name: existingEnrollment?.school.school_name,
                    course_name: existingEnrollment.course.title,
                    email: item.email,
                    token: token
                })


                studentStatus.status = "Sent";


            } else {
                // // The parent exists, check if the child exists
                const normalizeName = (name) => {
                    return name
                        .trim() // Remove leading/trailing spaces
                        .toLowerCase() // Convert to lowercase for case-insensitive comparison
                        .normalize("NFD") // Normalize accents, e.g., 'é' -> 'e'
                        .replace(/[\u0300-\u036f]/g, ""); // Remove diacritical marks
                };

                const student = existingParent.students.find(
                    (student) => student.email === item.email
                );

                // Child does not exist create a new account and send the course invite.
                if (!student) {
                    // Create new student
                    const userId = generateId();

                    const newUser = new User({
                        _id: new mongoose.Types.ObjectId(),
                        userId,
                        fullName: item?.fullName,
                        guardianFullName: item.guardianFullName,
                        email: item.email,
                        userType: "School",
                        grade: stdClass.startsWith("Pri")
                            ? "Primary"
                            : stdClass.startsWith("Year")
                                ? "Secondary"
                                : "Educator",
                        newCourseInvite: {
                            school: id,
                        },
                    });

                    const newStudentEnrollment = new StudentEnrollments({
                        _id: new mongoose.Types.ObjectId(),
                        course: existingEnrollment.course._id,
                        school: id,
                        checkModel: "User",
                        schoolCourseEnrollment: existingEnrollment._id,
                        user: newUser._id,
                        stdClass,
                        classTag
                    });

                    existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);
                    existingParent.students.push(newUser._id);
                    const token = newUser.generateAuthToken();

                    await Promise.all([newStudentEnrollment.save(), newUser.save(), existingParent.save()]);

                    let stdGrade = stdClass.startsWith("Pri")
                        ? "Primary"
                        : stdClass.startsWith("Year")
                            ? "Secondary"
                            : "Educator";

                    sendSingleEmailQueue.addSendEmailJob({
                        parentName: existingParent?.fullName,
                        childName: item?.fullName,
                        status: "new",
                        grade: stdGrade,
                        enrollment_id: newStudentEnrollment._id,
                        school_name: existingEnrollment.school.school_name,
                        course_name: existingEnrollment.course.title,
                        email: item.email,
                        token: token
                    })

                    // await school_course_invite(
                    //     existingParent.fullName,
                    //     item?.fullName,
                    //     "new",
                    //     stdGrade,
                    //     newStudentEnrollment._id,
                    //     existingEnrollment.school.school_name,
                    //     existingEnrollment.course.title,
                    //     item.email,
                    //     token
                    // );
                    studentStatus.status = "Sent";

                } else {

                    // Child already exist. Check if the child has a pending invite or is enrolled for this course
                    const studentEnrollment = await StudentEnrollments.findOne({
                        course: existingEnrollment.course._id,
                        school: id,
                        schoolCourseEnrollment: existingEnrollment._id,
                        status: { $ne: "Deactivated" },
                        user: student._id,
                    });

                    // if !studentEnrollment it means no invite has been sent before for this course

                    if (!studentEnrollment) {
                        // No invite for this course sent
                        const newStudentEnrollment = new StudentEnrollments({
                            _id: new mongoose.Types.ObjectId(),
                            course: existingEnrollment.course._id,
                            school: id,
                            checkModel: "User",
                            schoolCourseEnrollment: existingEnrollment._id,
                            user: student._id,
                            stdClass,
                            classTag
                        });

                        existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);

                        student.newCourseInvite = {
                            school: id
                        }

                        const token = student.generateAuthToken();
                        await Promise.all([newStudentEnrollment.save(), student.save()]);

                        let stdGrade = stdClass.startsWith("Pri")
                            ? "Primary"
                            : stdClass.startsWith("Year")
                                ? "Secondary"
                                : "Educator";

                        sendSingleEmailQueue.addSendEmailJob({
                            parentName: existingParent.fullName,
                            childName: student?.fullName,
                            status: "new",
                            grade: stdGrade,
                            enrollment_id: newStudentEnrollment._id,
                            school_name: existingEnrollment.school.school_name,
                            course_name: existingEnrollment.course.title,
                            email: item.email,
                            token: token
                        })

                        // await school_course_invite(
                        //     existingParent.fullName,
                        //     student?.fullName,
                        //     "new",
                        //     stdGrade,
                        //     newStudentEnrollment._id,
                        //     existingEnrollment.school.school_name,
                        //     existingEnrollment.course.title,
                        //     item.email,
                        //     token
                        // );
                        studentStatus.status = "Sent";


                    } else {
                        // So student is enrolled but could either have accepted or is pending
                        // If pending, Resend invite

                        if (studentEnrollment.status === "Pending" || studentEnrollment.status === "Accepted") {
                            //         // Re-send Email
                            let stdGrade = stdClass.startsWith("Pri")
                                ? "Primary"
                                : stdClass.startsWith("Year")
                                    ? "Secondary"
                                    : "Educator";

                            const token = student.generateAuthToken();
                            sendSingleEmailQueue.addSendEmailJob({
                                parentName: existingParent.fullName,
                                childName: student?.fullName,
                                status: "new",
                                grade: stdGrade,
                                enrollment_id: studentEnrollment._id,
                                school_name: existingEnrollment.school.school_name,
                                course_name: existingEnrollment.course.title,
                                email: item.email,
                                token: token
                            })
                            // await school_course_invite(
                            //     existingParent.fullName,
                            //     student?.fullName,
                            //     "new",
                            //     stdGrade,
                            //     studentEnrollment._id,
                            //     existingEnrollment.school.school_name,
                            //     existingEnrollment.course.title,
                            //     item.email,
                            //     token
                            // );
                            studentStatus.status = "Sent";

                        } else {

                            studentStatus.status = "Enrolled";
                        }

                    }

                }

            }
            result.push(studentStatus);
        } catch (error) {
            console.error(`Error processing student ${item.fullName}: ${error.message}`);
            result.push({
                fullName: item.fullName,
                email: item.email,
                status: "Failed", // Add failure status
            });
        }

    }
    await existingEnrollment.save();
    return result
}