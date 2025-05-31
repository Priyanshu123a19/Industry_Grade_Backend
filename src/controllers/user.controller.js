import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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


});

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
    

});

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

export {
    registeruser,
    loginUser,
    logoutUser,
    refreshAccessToken
}