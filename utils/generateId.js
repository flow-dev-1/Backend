module.exports = generateId = () => {
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    const paddedNum = randomNum.toString().padStart(4, "0");

    return `FLS${paddedNum}`;
};
