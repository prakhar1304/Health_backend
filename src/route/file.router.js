import Router from "express"
import { fileUpload } from "../controllers/file.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { getAllReports } from "../controllers/file.controller.js"

const router = Router();

router.route("/upload").post(
    upload.fields([
        { name: 'file' }
    ])
    , fileUpload);


router.get('/reports', getAllReports);

export default router;