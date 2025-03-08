import { ApiResponse } from '../utils/ApiRes.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

const fileUpload = asyncHandler(async (req, res, next) => {
    console.log("Received request body:", req.body);
    console.log("Received files:", req.files); // req.files instead of req.file

    if (!req.files || !req.files.file || req.files.file.length === 0) {
        throw new ApiError(400, "No file uploaded");
    }

    const localFilePath = req.files.file[0].path;
    console.log("localpath",localFilePath); // Access first uploaded file

    // Upload file to Cloudinary
    const uploadResult = await uploadOnCloudinary(localFilePath);
    console.log("uploadResult",uploadResult);
    if (!uploadResult) throw new ApiError(500, "File upload to Cloudinary failed");

    return res.status(200).json(new ApiResponse(200, uploadResult.url, "File uploaded successfully"));
});

export { fileUpload };
