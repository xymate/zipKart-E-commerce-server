import mongoose from "mongoose";


const schema= new mongoose.Schema({
    code:{
        type:String,
        required:[true,"Please enter the coupon codde"],
        unique:true,
    },
    amount:{
        type:Number,
        required:[true,"Please enter the discount amount"],
    }

})

export const Coupon= mongoose.model("Coupon",schema);