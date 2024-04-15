import mongoose from 'mongoose';


const schema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Please enter Name"],
    },
    photo:{
        type:String,
        required:[true,"Please enter photo"]
    },
    price:{
        type:Number,
        required:[true,"Please enter the price"],
    },
    stock:{
        type:Number,
        required:[true,"Please enter stock"],
    },
    category:{
        type:String,
        requried:[true,"Please enter the category"],
        trim:true,
    }
},
{
    timestamps:true,
}
);



export const Product=mongoose.model("Product",schema);

