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
  const nameParts1 = studentFullName.toLowerCase().split(" ");
  const nameParts2 = fullName.toLowerCase().split(" ");
  // Check if both names have the same number of parts and the exact parts match in order
  return (
    nameParts1.length === nameParts2.length &&
    nameParts1.every((part, index) => part === nameParts2[index])
  );
};
