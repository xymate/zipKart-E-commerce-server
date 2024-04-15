import { User } from "../models/User.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";

//MIDDLE TO MAKE SURE ONLY AMDIN IS ALLOWED
export const adminOnly=TryCatch(async (req,res,next)=>{
    const {id}=req.query;
    if(!id) return next(new ErrorHandler("Please Login kro na first",401));
    
    const user=await User.findById(id);
    if(!user){
        return next(new ErrorHandler("Inavlid ID",401));
    }
    
    if(user.role!=="admin"){
        return next(new ErrorHandler("You are not allowed to access this ",401));
    }

    next();

});