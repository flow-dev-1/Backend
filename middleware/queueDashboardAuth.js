const { timingSafeEqual } = require("crypto");

const matches = (actual, expected) => {
  const actualBuffer = Buffer.from(actual || "");
  const expectedBuffer = Buffer.from(expected || "");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

module.exports = function queueDashboardAuth(req, res, next) {
  const expectedUsername = process.env.QUEUE_DASHBOARD_USERNAME;
  const expectedPassword = process.env.QUEUE_DASHBOARD_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return res.status(503).send("Queue dashboard is not configured.");
  }

  const [scheme, encodedCredentials] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Basic" || !encodedCredentials) {
    res.set("WWW-Authenticate", 'Basic realm="FLOW Queue Dashboard"');
    return res.status(401).send("Authentication required.");
  }

  let credentials;
  try {
    credentials = Buffer.from(encodedCredentials, "base64").toString("utf8");
  } catch {
    credentials = "";
  }

  const separator = credentials.indexOf(":");
  const username = separator >= 0 ? credentials.slice(0, separator) : "";
  const password = separator >= 0 ? credentials.slice(separator + 1) : "";

  if (!matches(username, expectedUsername) || !matches(password, expectedPassword)) {
    res.set("WWW-Authenticate", 'Basic realm="FLOW Queue Dashboard"');
    return res.status(401).send("Invalid credentials.");
  }

  return next();
};
