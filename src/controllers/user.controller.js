import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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


export {
    registeruser
}