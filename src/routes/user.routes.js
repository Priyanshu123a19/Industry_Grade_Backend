import {Router} from "express";
import { registeruser } from "../controllers/user.controller.js";
//importing the middleware to be used
import {upload} from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
    //jate hue humse mitle jana means jate hue middleware(upload)se milna taki file upload ho sake
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registeruser
)

export default router;