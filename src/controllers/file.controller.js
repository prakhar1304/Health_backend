import { ApiResponse } from '../utils/ApiRes.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadToGCS } from '../utils/gcs.js';
import { ApiError } from '../utils/ApiError.js';
import vision from '@google-cloud/vision';
// import fs from 'fs';
import path from 'path';
import { convertTextToStructuredJSON } from '../utils/gemini.js';
import fs from "fs"
import poppler from "pdf-poppler"
import Tesseract from "tesseract.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import MedicalReport from "../models/MedicalReport.js"

// Check if GCP key file exists
if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error('GCP key file not found at:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
  process.exit(1); // Exit if the file is not found
}

const fileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Google Vision API Client
const client = new vision.ImageAnnotatorClient({
  keyFilename: fileName,
});

const cleanupOutputDirectory = async (directory) => {
  try {
    if (fs.existsSync(directory)) {
      await fs.remove(directory);
      console.log(`Cleaned up directory: ${directory}`);
    }
  } catch (error) {
    console.error(`Error cleaning up directory ${directory}:`, error);
  }
};


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


  const gcsUri = await uploadToGCS(localFilePath, fileName);


  let extractedText = "";
  let cloudinaryImageUrl = null;
  let outputDir = '';

  if (fileExt === '.pdf') {

    // If it's a PDF, use poppler + Tesseract
    outputDir = `output/${Date.now()}`;
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      const imagePaths = await convertPDFToImages(localFilePath, outputDir);

      const ocrResults = await Promise.all(imagePaths.map(performOCR));
      extractedText = ocrResults.join('\n');



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


  //  Using Gemini API to  structured JSON
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

    // Save kardo  each  report
    const savePromises = reportsArray.map(async (report) => {
      // Add summary field if it exists in additionalDetails
      if (report.additionalDetails && report.additionalDetails.summary) {
        report.summary = report.additionalDetails.summary;
        delete report.additionalDetails.summary;
      }

      const newReport = new MedicalReport(report);
      return await newReport.save();
    });


    savedReports = await Promise.all(savePromises);
    console.log("Reports saved to MongoDB:", savedReports.length);
  } catch (error) {
    // console.error("MongoDB save error:", error);
    if (outputDir) {
      await cleanupOutputDirectory(outputDir);
    }
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


  if (outputDir) {
    await cleanupOutputDirectory(outputDir);
  }

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
