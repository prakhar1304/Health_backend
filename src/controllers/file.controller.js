import { ApiResponse } from '../utils/ApiRes.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadToGCS } from '../utils/gcs.js';
import { ApiError } from '../utils/ApiError.js';
import vision from '@google-cloud/vision';
// import fs from 'fs';
import path from 'path';
import { fromPath } from 'pdf2pic';
import { convertTextToStructuredJSON } from '../utils/gemini.js';
import fs from "fs-extra"
import poppler from "pdf-poppler"
import Tesseract from "tesseract.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import MedicalReport from "../models/MedicalReport.js"
// Google Vision API Client
const client = new vision.ImageAnnotatorClient({
  keyFilename: '../../gcp-key.json',
});


// Convert PDF pages to images using poppler
const convertPDFToImages = async (pdfPath, outputDir) => {
  const opts = {
    format: 'jpeg',
    out_dir: outputDir,
    out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
    page: null,
  };

  try {
    await poppler.convert(pdfPath, opts);
    return fs.readdirSync(outputDir).map((file) => path.join(outputDir, file));
  } catch (err) {
    console.error('Error converting PDF to images:', err);
    throw err;
  }
};

// OCR using Tesseract.js
const performOCR = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    return text.trim();
  } catch (err) {
    console.error('OCR error:', err);
    return '';
  }
};

const fileUpload = asyncHandler(async (req, res, next) => {
  // console.log("Received request body:", req.body);
  // console.log("Received files:", req.files);

  if (!req.files || !req.files.file || req.files.file.length === 0) {
    throw new ApiError(400, "No file uploaded");
  }

  const localFilePath = req.files.file[0].path;
  const fileName = path.basename(localFilePath);
  const fileExt = path.extname(localFilePath).toLowerCase();

  // Upload to Google Cloud Storage
  const gcsUri = await uploadToGCS(localFilePath, fileName);
  // console.log("File uploaded to GCS:", gcsUri);

  let extractedText = "";
  let cloudinaryImageUrl = null;

  if (fileExt === '.pdf') {

    // If it's a PDF, use poppler + Tesseract
    const outputDir = `output/${Date.now()}`;
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      const imagePaths = await convertPDFToImages(localFilePath, outputDir);

      const ocrResults = await Promise.all(imagePaths.map(performOCR));
      extractedText = ocrResults.join('\n');

      // console.log("image path ", imagePaths[0]);
      // // ✅ Upload first image to Cloudinary

      if (imagePaths.length > 0) {
        const firstImagePath = imagePaths[0];
        const cloudinaryResponse = await uploadOnCloudinary(firstImagePath);
        cloudinaryImageUrl = cloudinaryResponse?.url || "";

      }

    } catch (error) {
      console.error('PDF OCR error:', error);
      throw new ApiError(500, 'PDF OCR Failed');
    }


  } else {
    try {
      const [result] = await client.textDetection(localFilePath);
      extractedText = result.fullTextAnnotation?.text || "No text found";
    } catch (error) {
      console.error("OCR Error:", error);
      throw new ApiError(500, "OCR Failed");
    }
  }

  // Clean up local file
  fs.unlinkSync(localFilePath);
  // console.log("link", cloudinaryResponse.url);

  // 🔥 Call Gemini API to get structured JSON
  let structuredJson;
  try {
    structuredJson = await convertTextToStructuredJSON(extractedText, cloudinaryImageUrl);
  } catch (err) {
    throw new ApiError(500, "Text parsing with Gemini failed");
  }
  console.log("cloudinaryResponse", cloudinaryImageUrl);


  // Save to MongoDB
  let savedReports = [];
  try {
    // Handle both single object and array cases
    const reportsArray = Array.isArray(structuredJson) ? structuredJson : [structuredJson];

    // Save each report
    const savePromises = reportsArray.map(async (report) => {
      // Add summary field if it exists in additionalDetails
      if (report.additionalDetails && report.additionalDetails.summary) {
        report.summary = report.additionalDetails.summary;
        delete report.additionalDetails.summary;
      }


      // 👉 Set the image URL (Cloudinary one)
      // report.image = cloudinaryImageUrl || "";

      const newReport = new MedicalReport(report);
      return await newReport.save();
    });


    savedReports = await Promise.all(savePromises);
    console.log("Reports saved to MongoDB:", savedReports.length);
  } catch (error) {
    console.error("MongoDB save error:", error);
    throw new ApiError(500, "Failed to save medical report to database");
  }


  // await MedicalReport.findByIdAndUpdate(savedReports._id,
  //   {
  //     $set:
  //     {
  //       image: cloudinaryImageUrl,
  //     }
  //   }, { new: true }
  // )

  return res.status(200).json(new ApiResponse(200, {
    savedReports
  }, "File uploaded & OCR processed successfully"));
});



// Get all medical reports
const getAllReports = asyncHandler(async (req, res) => {
  try {
    const reports = await MedicalReport.find().sort({ createdAt: -1 }); // Optional: sort by latest
    return res.status(200).json(new ApiResponse(200, reports, "All medical reports fetched successfully"));
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw new ApiError(500, "Failed to fetch medical reports from database");
  }
});




export { fileUpload, getAllReports };
