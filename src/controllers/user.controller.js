import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import e from 'express';

//writing a saperate function for refresh and access token handeling
const generateAcessAndRefreshToken = async (userId)=> {
    try {
        const user= await User.findById(userId)
        if (!user) {
            console.log("User not found for ID:", userId);
            throw new ApiError(404, "User not found for token generation");
        }
        console.log("User found for token:", user);

        //generating the access token using the createJWT method defined in the user model
        const accessToken=user.generateAccessToken();
        //generating the refresh token using the generateRefreshToken method defined in the user model
        const refreshToken=user.generateRefreshToken();

        //user ko refreshToken token de diya jaye
        user.refreshToken = refreshToken;
        //the valifdate before save is to avoid the password check everytime before saving the user 
        await user.save({validateBeforeSave: false});

        return {
            accessToken,
            refreshToken
        } 
    } catch (error) {
        throw new ApiError(500, "Error generating the access and refresh token")
    }
}

const registeruser=asyncHandler( async(req,res)=>{
    const {fullName,email,password,username}=req.body;
    console.log("email",email);

    //validating that the user has provided all the required fields
    if(
        //the some method will check for all field and if any of them is empty then it will return true
        //always use this method to check for empty fields very useful
        [fullName,email,password,username].some((field)=>field?.trim()=== "")){
            throw new ApiError(400,"ALl fields are required");
        }
    
    //now finding that user already exists or not
    const existedUser = await User.findOne({
    $or: [{ email }, { username }]
    });

    //now u can use that to check
    if(existedUser){
        throw new ApiError(409,"User already exists");
    }

    //file updloading using multer and cloudinary
    const avatarLocalpath=req.files?.avatar[0]?.path;
    //for the coverimage we use the vanilla old style coding to see if its there or not 
    let coverImageLocalpath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalpath=req.files.coverImage[0].path;
    }
    console.log("coverImageLocalpath",coverImageLocalpath);
    //now uploading the file to cloudinary
    if(!avatarLocalpath){
        throw new ApiError(408,"Avatar is required");
    }
    
    //uploading the file to cloudinary
    const avatar= await uploadOnCloudinary(avatarLocalpath)
    const coverImage= await uploadOnCloudinary(coverImageLocalpath)

    if(!avatar){
        throw new ApiError(500,"Avatar upload failed");
    }

    //creationg the object of the user for saving in the database
    const user= await User.create({
        fullName,
        avatar: avatar.url, 
        //always cross check the url of the image
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //seeinng and getting the currently formed user
    //also removing the password and refresh token from the user object
    //so that in the response we dont send the password and refresh token
    const createdUser= await User.findById(
        user._id).select("-password -refreshToken)"
        )
    if(!createdUser){
        throw new ApiError(500,"User creation failed");
    }
    //sending the response this time after successfully creating the user
    return res.status(201).json(
        //making the customized ApiResponse usage and then using it
        new ApiResponse(201,createdUser,"User created successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    //first try to fetch the data from the reqrest body
    const {username , email, password} = req.body;
    console.log(email)

    //checking that the identification fields are provided or not
    if(!username && !email){
        throw new ApiError(400, "Username or email are required");
    }

    const user = await User.findOne({
        //the or operator over here is used to check if the user exists with either username or email
        //if any of them is true then it will return the user
        $or: [{username}, {email}]
    });

    if(!user){
        throw new ApiError(404, "User not found");
    }
    //now matching the password for the user]\
    //the isPasswordCorrect method is defined in the user model
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid password");
    }

    const {accessToken ,refreshToken}=await generateAcessAndRefreshToken(user._id)

    //making a new refereance of the user with the updated refresh token and other things
    const loggedInUser= await User.findById(user._id).select("-password -refreshToken");
    
    //sending the cookie to the user
    const options={
        httpOnly:true,
        secure: true
    }

    //finally here we are setting the response and cookie and sending the response
    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "user logged in successfully"
    )
)


})

const logoutUser = asyncHandler(async (req, res) => {
    //here we have the access for the user object from the auth middleware
    await User.findByIdAndUpdate(req.user._id,
        {
            refreshToken: undefined
        },
        {
            new: true
        }
    );

    //now we will paste the options for the cookie
    const options={
        httpOnly:true,
        secure: true
    }
    //finally we will the clear the cookies from the client side aas well as the refresh token from the database
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )
    

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //here we will handle the refresh token and generate a new access token
    //here if access token expires then we hit this functions endpoint to get a new access token
    //the new access token is generated using the refresh token,,,,,and also the refresh token is also refreshed
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required || Unauthorized request");
    }
    //now for verfying the refresh token first we will decode it
    try {
        const decodedToken=jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        //now go and see the what refresh token contains as info 
        //u will see that it contains the user id
        //so we will use that user id to find the user in the database
        const user= await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(404, "User not found");
        }
    
        //now we will check if the refresh token in the database is same as the incoming refresh token
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Invalid refresh token");
        }
    
        //now we will generate the new access and refresh token
        const options={
            httpOnly: true,
            secure: true
        }
    
        //generating the new access and refresh token
        const {accessToken, newRefreshToken} = await generateAcessAndRefreshToken(user._id);
    
        //returning the response with the new access token and refresh token
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    accessToken,
                    newRefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    //here we will handle the change password request
    const {oldPassword, newPassword} = req.body;

    //finding the user first so that we can first verify the old password
    const user= await User.findById(req.user._id);
    if(!user){
        throw new ApiError(404, "User not found");
    }

    //now we will check if the old password is correct or not
    const isPasswordValid=await user.isPasswordCorrect(oldPassword);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid old password");
    }

    //now we will update the password of the user
    user.password = newPassword;
    //the validateBeforeSave is to avoid the password check everytime before saving the user
    await user.save({validateBeforeSave: false})

    //return the response with the success message
    return res
})

//making a saperate function for getting the current user
const getCurrentUser = asyncHandler(async (req, res) => {
    //just reiterating the user from the auth middleware
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    //first receive the fields from the request body that need to be updated
    const {fullName, email}=req.body;
    //validating that the user has provided all the required fields
    if(!fullName || !email){
        throw new ApiError(400, "Full name and email are required");
    }
    
    //direclty finding the user and updating the fields
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            fullName,
            email
        },
        {
            new: true, //to return the updated user
        }).select("-password)")

        return res.status(200).json(
            new ApiResponse(200, user, "User details updated successfully")
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    //so here we will first receive the file from the request
    const avatarLocalpath = req.file?.path

    //checking if the file is present or not
    if(!avatarLocalpath){
        throw new ApiError(400, "Avatar is required")
    }

    //now here first we will handle the uploading of the file to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalpath)
    if(!avatar.url){
        throw new ApiError(500,"Avatar upload failed || error in uploading the avatar")
    }

    //finally updating the user and the avatar field 
    const user=User.findByIdAndUpdate(
        req.user._id,
        {
            avatar: avatar.url
        },
        {
            new: true //to return the updated user
        }
    ).select("-password ")

    return res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    )   
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    //so here we will first receive the file from the request
    const CoverImageLocalpath = req.file?.path

    //checking if the file is present or not
    if(!CoverImageLocalpath){
        throw new ApiError(400, "CoverImage is required")
    }

    //now here first we will handle the uploading of the file to cloudinary
    const CoverImage = await uploadOnCloudinary(CoverImageLocalpath)
    if(!CoverImage.url){
        throw new ApiError(500,"CoverImage upload failed || error in uploading the CoverImage")
    }

    //finally updating the user and the avatar field 
    const user=User.findByIdAndUpdate(
        req.user._id,
        {
            coverimage: CoverImage.url
        },
        {
            new: true //to return the updated user
        }
    ).select("-password ")

    return res.status(200).json(
        new ApiResponse(200, user, "User cover image updated successfully")
    )

})

const getUserChannelProfile =asyncHandler(async (req, res) => {
    //first get the user from the req section params
    const {username} = req.params;

    //validating that the username is provided or not
    if(!username){
        throw new ApiError(400, "Username is required");
    }

    //now here we can find the number of subscribers and the channels the user has subscribed to
    //here we will be using the aggregation pipeline to get the user details along with the subscribers count

    const channel=await User.aggregate([
        {
            $match: { username: username.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions", //the name of the collection in the database
                localField: "_id", //the field in the user collection that we want to match with the foreign field
                foreignField: "subscriber", //the field in the subscription collection in which we want to match the local field
                as: "subscribers" //the name of the field to be added in the user object
            }
        },
        {
            $lookup: {
                from: "subscriptions",//the name of the collection in the database
                localField: "_id",//the field in the user collection that we want to match with the foreign field
                foreignField: "channel",//the field in the subscription collection in which we want to match the local field
                as: "subscribedTo" //the name of the field to be added in the user object
            }
        },
        //adding the third stage to add these fiels in the schema containing the localfiels as new fields
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" }, //counting the number of subscribers
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                //now getting the info that wather the current user is subscribed to the channel or not
                isSubscribed: {
                    $cond: {
                        //here we will be checking that if the user id is present in the subscribers array or not
                        //the $in operator is used to check if the user id is present in the subscribers array or not
                        if: { $in: [req.user?._id , "$subscribers.subscriber"] },
                        then: true, //then the user is subscribed to the channel
                        else: false //else the user is not subscribed to the channel
                    }
                }
            }
        },
        //adding the final stage to just send the info that is required to the user
        //basically the finally joint object fields that we want to send to the user
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverimage: 1,
                email: 1,
            }
        }
    ])

    //finally validating that we got the info that we were trying to get or not
    if(!channel?.channel.length){
        throw new ApiError(404, "Channel not found");
    }

    //finally here we will return the response with the channel info
    return res.status(200).json(
        new ApiResponse(
            200, 
            channel[0], //since we are using the aggregation pipeline it will return an array of objects
            //but in our case we are only getting one object so we will return the first object
            //if u get more than one object in some other cases then u can use the same logic and select the object required out of this aggrigation response array and use it
            "Channel profile fetched successfully"
        )
    )

})

const getWatchHistory = asyncHandler(async (req, res) => {
    //so remember one thing that when we send the mogdb id in the aggregation pipeline
    //we have to convert it to the object id using the mongoose.Types.ObjectId method

    const user=await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user._id) }
        },
        {
            //here we will use the lookup operator to join the watch history collection with the user collection
            $lookup: {
                from : "videos",
                localField: "watchHistory", //the field in the user collection that we want to match with the foreign field
                foreignField: "_id", //the field in the video collection in which we want to match the local field
                as: "watchHistory",
                //here now we will be adding the nested pipline to get the details of the owner of the video
                pipeline:[
                    {
                        //here we will be jpining the video details with the user that is the owner of the video
                        $lookup: {
                            from: "users", //the name of the collection in the database
                            localField: "owner", //the field in the video collection that we want to match with the foreign field
                            foreignField: "_id", //the field in the user collection in which we want to match the local field
                            as: "owner",
                            //furhter we will be adding the pipeline to get the owner details to have a proper projection 
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        //here i am trying to get the retrived owner details to be injected as a variable not as an array
                        $addFields: {
                            owner: {
                                $first: "$owner" //this will get the first element of the owner array
                            }
                        }
                    }
                ]
            }
        }
    ])
    //here we will be sending the response with the user watch history
    return res.status(200).json(
        new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully")
    )
})
export {
    registeruser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}