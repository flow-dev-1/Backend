const getActivityIdentifier = (activity) => {
  if (activity?.page != null) return `page:${String(activity.page)}`;
  if (activity?.activity != null) return `activity:${String(activity.activity)}`;
  return null;
};

const getActivityPosition = (activity) =>
  Number(activity?.page ?? activity?.activity ?? Number.MAX_SAFE_INTEGER);

const mergeCourseActivities = (savedActivities = [], incomingActivities = []) => {
  const keyedActivities = new Map();
  const unkeyedActivities = [];

  [...savedActivities, ...incomingActivities].forEach((activity) => {
    const identifier = getActivityIdentifier(activity);
    if (identifier) {
      keyedActivities.set(identifier, activity);
    } else {
      unkeyedActivities.push(activity);
    }
  });

  return [...keyedActivities.values()]
    .sort((firstActivity, secondActivity) =>
      getActivityPosition(firstActivity) - getActivityPosition(secondActivity)
    )
    .concat(unkeyedActivities);
};

module.exports = {
  getActivityIdentifier,
  mergeCourseActivities
};
