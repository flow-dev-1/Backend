const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (!["string", "number", "boolean"].includes(typeof value)) return "";
  return String(value).trim();
};

const getSelectedOptions = (selection, options) => {
  if (Array.isArray(selection)) {
    return selection
      .map((value, index) => {
        if (typeof value === "string") return value.trim();
        return value ? options[index] : "";
      })
      .filter(Boolean);
  }

  if (!selection || typeof selection !== "object") return [];

  return Object.entries(selection)
    .filter(([, selected]) => Boolean(selected))
    .map(([index]) => options[Number(index)])
    .filter(Boolean);
};

const hasExistingFeedback = (feedback) => {
  if (typeof feedback === "string") return Boolean(feedback.trim());
  if (Array.isArray(feedback)) {
    return feedback.some((item) =>
      typeof item === "string"
        ? Boolean(item.trim())
        : Boolean(toText(item?.value))
    );
  }
  return feedback !== null && feedback !== undefined;
};

const formatSelections = (answer, options, heading, otherHeading) => {
  if (!answer || typeof answer !== "object") return "";

  const selected = getSelectedOptions(answer.checkboxAnswers, options);
  const other = toText(answer.textAnswer);
  const parts = [];

  if (selected.length) parts.push(`${heading}: ${selected.join(", ")}`);
  if (other) parts.push(`${otherHeading}: ${other}`);

  return parts.join("\n");
};

module.exports = {
  formatSelections,
  getSelectedOptions,
  hasExistingFeedback,
  toText
};
