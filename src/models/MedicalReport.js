import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  name: String,
  value: String,
  unit: String,
  range: String,
  status: String,
});

const medicalReportSchema = new mongoose.Schema({
  hospital_name: String,
  doctor_name: String,
  date: String,
  report_type: String,
  tests: [testSchema],
  summary: String,
  gcsUri: String, // add original file URI
}, { timestamps: true });

export const MedicalReport = mongoose.model("MedicalReport", medicalReportSchema);
