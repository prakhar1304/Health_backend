import fs from 'fs';
//automatically  --> file system
import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload an image

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });
    //file  has ben  upload  sucessfully
    console.log('file uploaded', response.url);
    //print  public  url
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the   locally  saved  temp  file --> upload operation got  fail
    return null;
  }
};

export { uploadOnCloudinary };
