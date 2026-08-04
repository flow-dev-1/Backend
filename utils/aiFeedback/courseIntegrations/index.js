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
const {
  resilienceGritWeek1Integration
} = require("./resilience-grit/week1");
const {
  resilienceGritWeek2Integration
} = require("./resilience-grit/week2");
const {
  resilienceGritWeek3Integration
} = require("./resilience-grit/week3");
const {
  resilienceGritWeek4Integration
} = require("./resilience-grit/week4");
const {
  resilienceGritWeek5Integration
} = require("./resilience-grit/week5");
const {
  selfAwarenessWeek1Integration
} = require("./self-awareness/week1");
const {
  selfAwarenessWeek2Integration
} = require("./self-awareness/week2");
const {
  selfAwarenessWeek3Integration
} = require("./self-awareness/week3");
const { selfAwarenessWeek4Integration } = require("./self-awareness/week4");
const { selfAwarenessWeek5Integration } = require("./self-awareness/week5");
const { emotionalRegulationWeek1Integration } = require("./emotional-regulation/week1");
const { emotionalRegulationWeek2Integration } = require("./emotional-regulation/week2");
const { emotionalRegulationWeek3Integration } = require("./emotional-regulation/week3");
const { emotionalRegulationWeek4Integration } = require("./emotional-regulation/week4");
const { emotionalRegulationWeek5Integration } = require("./emotional-regulation/week5");
const { tot2Week1Integration } = require("./tot-2/week1");
const { tot2Week2Integration } = require("./tot-2/week2");
const { tot2Week3Integration } = require("./tot-2/week3");
const { tot2Week4Integration } = require("./tot-2/week4");
const { tot2Week5Integration } = require("./tot-2/week5");
const { tot1Week1Integration } = require("./tot-1/week1");
const { tot1Week2Integration } = require("./tot-1/week2");
const { tot1Week3Integration } = require("./tot-1/week3");
const { tot1Week4Integration } = require("./tot-1/week4");
const { tot1Week5Integration } = require("./tot-1/week5");
const { tot1Week6Integration } = require("./tot-1/week6");

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
  ["compassion:5", compassionWeek5Integration],
  ["resilience-grit:1", resilienceGritWeek1Integration],
  ["resilience-grit:2", resilienceGritWeek2Integration],
  ["resilience-grit:3", resilienceGritWeek3Integration],
  ["resilience-grit:4", resilienceGritWeek4Integration],
  ["resilience-grit:5", resilienceGritWeek5Integration],
  ["self-awareness:1", selfAwarenessWeek1Integration],
  ["self-awareness:2", selfAwarenessWeek2Integration],
  ["self-awareness:3", selfAwarenessWeek3Integration],
  ["self-awareness:4", selfAwarenessWeek4Integration],
  ["self-awareness:5", selfAwarenessWeek5Integration],
  ["emotional-regulation:1", emotionalRegulationWeek1Integration],
  ["emotional-regulation:2", emotionalRegulationWeek2Integration],
  ["emotional-regulation:3", emotionalRegulationWeek3Integration],
  ["emotional-regulation:4", emotionalRegulationWeek4Integration],
  ["emotional-regulation:5", emotionalRegulationWeek5Integration],
  ["tot-2:1", tot2Week1Integration],
  ["tot-2:2", tot2Week2Integration],
  ["tot-2:3", tot2Week3Integration],
  ["tot-2:4", tot2Week4Integration],
  ["tot-2:5", tot2Week5Integration],
  ["tot-1:1", tot1Week1Integration],
  ["tot-1:2", tot1Week2Integration],
  ["tot-1:3", tot1Week3Integration],
  ["tot-1:4", tot1Week4Integration],
  ["tot-1:5", tot1Week5Integration],
  ["tot-1:6", tot1Week6Integration]
]);

const getCourseIntegration = (courseKey, weekNumber) =>
  courseIntegrationRegistry.get(`${courseKey}:${Number(weekNumber)}`) || null;

module.exports = {
  getCourseIntegration
};
