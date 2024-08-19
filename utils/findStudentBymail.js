const doesFullNameMatch = require("./fullNameCheck");
// Function to find a student by email and full name in an array
module.exports = findStudentByEmailAndFullName = async (
  email,
  fullName,
  students
) => {
  const emailLower = email.toLowerCase();

  for (const student of students) {

    if (
      student.email &&
      student.email.toLowerCase() === emailLower &&
      (await doesFullNameMatch(student.fullName, fullName))
    ) {
      return student;
    }
  }

  return null; // No match found
};

