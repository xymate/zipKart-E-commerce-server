import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


export const uploadOnCloudinary=async(localFilePath:any)=>{
    try {
         if(!localFilePath)return null;

        const res=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",
        });

        return res.secure_url;

    } catch (error) {
        fs.unlinkSync(localFilePath);

        //remove the locally saved temp file as the upload operation got failed\
    }
}

export const deleteOnCloudinary=(serverfilepath:any)=>{
    cloudinary.api
  .delete_resources([serverfilepath], 
    { type: 'upload', resource_type: 'image' })
  .then(console.log);
}
