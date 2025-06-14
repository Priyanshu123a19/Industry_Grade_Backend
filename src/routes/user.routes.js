import {Router} from "express";
import { changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    registeruser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage 
} from "../controllers/user.controller.js";
//importing the middleware to be used
import {upload} from "../middlewares/multer.middleware.js";
import { loginUser } from "../controllers/user.controller.js";
import { logoutUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controller.js";
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

//now u see why we write the next at the end of the middleware function that is becausae we want to call the next function after the middleware is executed
//the next function can be the controller function or any other middleware function
router.route("/login").post( loginUser)
router.route("/logout").post(verifyJWT, logoutUser);
//mp veriyJwt because we are fetching the user using the refresh token id so no need of req.user
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").post(verifyJWT,getCurrentUser);
router.route("/update_account").patch(verifyJWT,updateAccountDetails)   
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;