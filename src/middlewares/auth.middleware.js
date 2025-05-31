//over here we will make the auth middleware for the varification of the tokens sent by the user

import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, res, next)=>{
    //here we will write the logic for checking the user jwt token
    //the second method after the or symbol is user to check th token that comes from the headers.....then it is converted to string and the "Bearer " is removed from it
    try {
        const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
            throw new ApiError(401, "Access token is required");
        }
        //now we will verify with the jwt weather the token is valid or not
        const decodedToken= jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        //now getting the user form the databse with the id taht is stored in the jwt webtoken
        const user= await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if(!user){
            throw new ApiError(404, "User not found || invalid access token");
        }
    
        //addint the user to the request object
        req.user = user;
        //now calling the next middleware
        //next ka matlab mera kaam ho gya hai ab next aage ka process chalega
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
})