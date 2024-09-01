const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for an answer
const AnswerSchema = new Schema({
  answer: { type: String, required: true }
});

// Schema for a card
const CardSchema = new Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },
  imageIndex: { type: Number, required: true }
});

// Schema for the buckets (yes, no, sometimes)
const BucketsSchema = new Schema({
  yes: { type: [CardSchema], default: [] },
  no: { type: [CardSchema], default: [] },
  sometimes: { type: [CardSchema], default: [] }
});

// Main schema for activities
const ActivitySchema = new Schema({
  activity: { type: Number, required: true },
  answers: { type: [AnswerSchema], default: [] },
  cards: { type: [CardSchema], default: [] },
  buckets: { type: BucketsSchema, default: null },
  selectedPersonality: { type: AnswerSchema, default: null }
});

// Schema for the overall structure (Activities)
const ActivitiesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "checkModel",
  },
  email: { type: String },
  checkModel: {
    type: String,
    enum: ["User", "Admin", "School", "Educator"],
  },
  week: {
    type: String,
    required: true,
  },
  activities: {
    type: [ActivitySchema], // Array of ActivitySchema
    required: true,
  },
  courseEnrollment: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Course",
  },
  additionalData: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {} // For any other non-standard fields like "0", "1", "2"
  },
      isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
},
    {
        timestamps: true,
    });

// Create the model
const Activity = mongoose.model("Activity", ActivitiesSchema);

module.exports = Activity;
