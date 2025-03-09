import { ApiResponse } from '../utils/ApiRes.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadToGCS } from '../utils/gcs.js';
import { ApiError } from '../utils/ApiError.js';
import vision from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';
import { fromPath } from 'pdf2pic';
import { convertTextToStructuredJSON } from '../utils/gemini.js';

// Google Vision API Client
const client = new vision.ImageAnnotatorClient({
  keyFilename: '../../gcp-key.json',
});

const fileUpload = asyncHandler(async (req, res, next) => {
  console.log("Received request body:", req.body);
  console.log("Received files:", req.files);

  if (!req.files || !req.files.file || req.files.file.length === 0) {
    throw new ApiError(400, "No file uploaded");
  }

  const localFilePath = req.files.file[0].path;
  const fileName = path.basename(localFilePath);
  const fileExt = path.extname(localFilePath).toLowerCase();

  // Upload to Google Cloud Storage
  const gcsUri = await uploadToGCS(localFilePath, fileName);
  console.log("File uploaded to GCS:", gcsUri);

  let extractedText = "";

  if (fileExt === '.pdf') {
    try {
      // Convert PDF to images using pdf2pic
      const options = {
        density: 200,
        saveFilename: "temp_image",
        savePath: "./temp_images",
        format: "png",
        width: 2000,
        height: 2000,
      };

      const convert = fromPath(localFilePath, options);

      // You can define how many pages to convert (here we're converting all)
      const numPagesToConvert = 5; // You can set this dynamically if you want to detect total pages
      const allTextPromises = [];

      for (let page = 1; page <= numPagesToConvert; page++) {
        const pageResult = await convert(page);
        const tempImgPath = pageResult.path;

        const [result] = await client.textDetection(tempImgPath);
        const pageText = result.fullTextAnnotation?.text || "";

        allTextPromises.push(pageText);

        // Cleanup image file
        fs.unlinkSync(tempImgPath);
      }

      extractedText = allTextPromises.join('\n\n--- Page Break ---\n\n');

    } catch (error) {
      console.error("PDF processing error:", error);
      throw new ApiError(500, "PDF processing failed");
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

  // 🔥 Call Gemini API to get structured JSON
  let structuredJson;
  try {
    structuredJson = await convertTextToStructuredJSON(extractedText);
  } catch (err) {
    throw new ApiError(500, "Text parsing with Gemini failed");
  }



  return res.status(200).json(new ApiResponse(200, {
    gcsUri,
    extractedText,
    structuredJson
  }, "File uploaded & OCR processed successfully"));
});

export { fileUpload };
