import mongoose, { Document } from "mongoose"
import { OrderItemType, invalidateCacheProps } from "../types/types.js";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";
import { config } from "dotenv";
import { Order } from "../models/order.js";

export const connectDB=(uri:string)=>{
    mongoose.connect(uri,{
        dbName:"Ecommerce24",
    }).then(c=>console.log(`DB connected to ${c.connection.host}:${c.connection.port}`))
    .catch((e)=>console.log(e));
}

export const invalidateCache=async ({
    product,
    order,
    admin,
    userId,
    orderId,
    productId,
}:invalidateCacheProps)=>{
    
    if(product){
        const productKeys:string[]=[
            "latest-products",
            "categories",
            "all-products",
        ];

        if(typeof productId==="string"){
            productKeys.push(`product-${productId}`);
        }

        if(typeof productId==="object")productId.forEach(i=>{
            productKeys.push(`product-${i}`);
        })


        myCache.del(productKeys);
    }
    if(order){
        const orderKeys:string[]=[
            "allorders",
            `myorder-${userId}`,
            `order-${orderId}`,
        ];

        const orders=await Order.find({}).select("_id");

        

        myCache.del(orderKeys);
    }
    if(admin){
         myCache.del(["admin-stats","admin-pie-charts","admin-bar-charts","admin-line-charts"])  ;
    }

};

export const reduceStock=async  (orderItems:OrderItemType[])=>{
    
    for(let i=0;i<orderItems.length;i++){
        const order=orderItems[i];
        const product=await Product.findById(order.productId);
        if(!product)throw new Error("Product not found");
        product.stock-=order.quantity;
    }

};

export const calculatePercentage=(thismonth:number ,lastmonth:number)=>{

    if(lastmonth===0){
        return thismonth*100;
    }

    const percent=((thismonth)/lastmonth)*100;
    return Number(percent.toFixed(0));
};

export const getInventories=async ({
        categories,
        Productcount,
    }:{
        categories:(string|null|undefined)[];
        Productcount:number;
    })=>{

    const categoriesCountPromise=categories.map((category)=>Product.countDocuments({category}));

    const categoriesCount=await Promise.all(categoriesCountPromise);

    const categoryCount:Record<string,number>[]=[];

    categories.forEach((category,i)=>{
        categoryCount.push({
            [String(category)]:Math.round((categoriesCount[i]/Productcount*100)),
        })
    });

    return categoryCount;

};

interface MyDocument extends Document{
    createdAt:Date;
    discount?:number;
    total?:number;
}


export const getChartData=({length,docArr,property}:{length:number,docArr:MyDocument[],property?:"discount"|"total"})=>{
    const data=new Array(length).fill(0);

    const today=new Date();

    docArr.forEach((i)=>{
        const creationDate=i.createdAt;
        const monthDiff=(today.getMonth()-creationDate.getMonth()+12)%12;

        if(monthDiff<length){

            if(property){
                data[length-monthDiff-1]+=i[property];
            }
            data[length-monthDiff-1]+=1;
           

        }
    });

    return data;
};