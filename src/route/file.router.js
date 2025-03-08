import Router from "express"
import { fileUpload } from "../controllers/file.controller.js"
import  {upload} from "../middlewares/multer.middleware.js"

const router =  Router();

router.route("/file").post(
    upload.fields([
        {name:'file'}
    ])
    ,fileUpload)


    export default router;