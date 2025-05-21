import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });
    
    const uploadOnCloudinary = async (localFilePath) => {
        try {
            if(!localFilePath) return null;
            const response = await cloudinary.uploader.upload(localFilePath,{
                resource_type: 'auto'
            })
            //file has been uploaded successfully
            console.log("file has been uploaded successfully", response.url);
            return response
        }catch(error){
            fs.unlinkSync(localFilePath);
            //removing that file from our local storage
            return null;
        }
    }

    export { uploadOnCloudinary };