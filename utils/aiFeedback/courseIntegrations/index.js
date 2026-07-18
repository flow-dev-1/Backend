const {
  transition2Week1Integration
} = require("./transition-2/week1");
const {
  transition2Week2Integration
} = require("./transition-2/week2");
const {
  transition2Week3Integration
} = require("./transition-2/week3");
const {
  transition2Week4Integration
} = require("./transition-2/week4");
const {
  transition2Week5Integration
} = require("./transition-2/week5");
const {
  compassionWeek1Integration
} = require("./compassion/week1");
const {
  compassionWeek2Integration
} = require("./compassion/week2");
const {
  compassionWeek3Integration
} = require("./compassion/week3");
const {
  compassionWeek4Integration
} = require("./compassion/week4");
const {
  compassionWeek5Integration
} = require("./compassion/week5");

const courseIntegrationRegistry = new Map([
  ["transition-2:1", transition2Week1Integration],
  ["transition-2:2", transition2Week2Integration],
  ["transition-2:3", transition2Week3Integration],
  ["transition-2:4", transition2Week4Integration],
  ["transition-2:5", transition2Week5Integration],
  ["compassion:1", compassionWeek1Integration],
  ["compassion:2", compassionWeek2Integration],
  ["compassion:3", compassionWeek3Integration],
  ["compassion:4", compassionWeek4Integration],
  ["compassion:5", compassionWeek5Integration]
]);

const getCourseIntegration = (courseKey, weekNumber) =>
  courseIntegrationRegistry.get(`${courseKey}:${Number(weekNumber)}`) || null;

module.exports = {
  getCourseIntegration
};
