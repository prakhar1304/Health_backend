import multer from "multer";
import path from "path";
import fs from "fs";

//process.cwd() gives you the current working directory — that’s usually the root directory of your project (where your package.json is located).
// Define temp upload directory
const uploadPath = path.join(process.cwd(), "public", "temp");

// Ensure directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

export { upload};
