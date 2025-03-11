import { Storage } from '@google-cloud/storage';
import path from 'path';


const fileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const storage = new Storage({
  keyFilename: fileName, // Path to your JSON file
});

const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME;

const uploadToGCS = async (localFilePath, destination) => {
  const bucket = storage.bucket(BUCKET_NAME);
  await bucket.upload(localFilePath, {
    destination,
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  console.log(`Uploaded to gs://${BUCKET_NAME}/${destination}`);
  return `gs://${BUCKET_NAME}/${destination}`;
};

export { uploadToGCS };
