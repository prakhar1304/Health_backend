import mongoose from 'mongoose';

const medicalReportSchema = new mongoose.Schema({
  title: String,
  type: String,
  doctor: String,
  date: String,
  image: String,
  hospital: String,
  summary: String,
  additionalDetails: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const MedicalReport = mongoose.model("MedicalReport", medicalReportSchema);
export default MedicalReport;
