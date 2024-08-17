module.exports = doesFullNameMatch = (studentFullName, fullName) => {
  // NB: keep this incase we want to check 2/3 of name pass
  // const studentNameParts = studentFullName.toLowerCase().split(" ");

  // // Check if any subset of 2 or 3 parts of `fullNameParts` are present in `studentNameParts`
  // const combinations = fullNameParts.length === 3
  //   ? [
  //       [0, 1], [0, 2], [1, 2],    // 2-part combinations from 3 parts
  //       [0, 1, 2]                    // All 3 parts
  //     ]
  //   : [ [0, 1] ];                  // Only 2-part combinations if 2 parts

  // return combinations.some(indices => {
  //   const subset = indices.map(i => fullNameParts[i].toLowerCase());
  //   return subset.every(part => studentNameParts.includes(part)) &&
  //          studentNameParts.every(part => subset.includes(part));
  // });

  const nameParts = fullName.toLowerCase().split(" ");
  const studentNameParts = studentFullName.toLowerCase().split(" ");

  // Check if all name parts are present in any order
  return (
    nameParts.every((part) => studentNameParts.includes(part)) &&
    studentNameParts.every((part) => nameParts.includes(part))
  );
};
