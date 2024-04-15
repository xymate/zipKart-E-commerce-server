import { callbackify } from "util";
import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { User } from "../models/User.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { calculatePercentage, getChartData, getInventories } from "../utils/features.js";


export const getDashboardStats=TryCatch(async(req,res,next)=>{

    let stats={};

    if(myCache.has("admin-stats")){
        stats=JSON.parse(myCache.get("admin-stats" )as string);
    }
    else{
         const today=new Date();

         const sixMonthsAgo=new Date();
         sixMonthsAgo.setMonth(sixMonthsAgo.getMonth()-6);


         const thisMonth={
            start:new Date(
                today.getFullYear(),
                today.getMonth(),
                1),
            end:today,
         }

        const lastMonth={
            start:new Date(
                today.getFullYear(),
                today.getMonth()-1,
                1),
            end:new Date(today.getFullYear(),today.getMonth(),0),
        }

        const thisMonthProductsPromise= Product.find({
            createdAt:{
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        });

        const lastMonthProductsPromise= Product.find({
            createdAt:{
                $gte:lastMonth.start,
                $lte:lastMonth.end,
            }
            
        });

        const thisMonthUsersPromise= User.find({
            createdAt:{
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        });

        const lastMonthUsersPromise= User.find({
            createdAt:{
                $gte:lastMonth.start,
                $lte:lastMonth.end,
            }
            
        });

        const thisMonthOrdersPromise= Order.find({
            createdAt:{
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        });

        const lastMonthOrdersPromise= Order.find({
            createdAt:{
                $gte:lastMonth.start,
                $lte:lastMonth.end,
            }
            
        }) ;

        const lastsixMonthAgoOrdersPromise= Order.find({
            createdAt:{
                $gte:sixMonthsAgo,
                $lte:today,
            }
            
        }) ;

        const latestTransactionPromise=Order.find({}).select(["orderItems","discount","total","status"]).limit(4);



        const [thisMonthProducts,
            thisMonthOrders,
            thisMonthUsers,
            lastMonthOrders,
            lastMonthProducts,
            lastMonthUsers,
            Productcount,
            Usercount,
            allOrders,
            lastsixMonthsOrders,
            categories,
            femaleUsers,
            latestTransactions] =await Promise.all([
            thisMonthProductsPromise,
            thisMonthOrdersPromise,
            thisMonthUsersPromise,
            lastMonthOrdersPromise,
            lastMonthProductsPromise,
            lastMonthUsersPromise,
            Product.countDocuments(),
            User.countDocuments(),
            Order.find({}).select("total"),
            lastsixMonthAgoOrdersPromise,
            Product.distinct("category"),
            User.countDocuments({gender:"female"}),
            latestTransactionPromise,
        ]);

        const thisMonthRevenue=thisMonthOrders.reduce((total,order)=>total+(order.total||0),0);

        const lastMonthRevenue=lastMonthOrders.reduce((total,order)=>total+(order.total||0),0);

        const revenueChangePercentage=calculatePercentage(
            thisMonthRevenue,
            lastMonthRevenue,
        )

        const productChangePercentage=calculatePercentage(
            thisMonthProducts.length,
            lastMonthProducts.length
        );

        const userChangePercentage=calculatePercentage(
            thisMonthUsers.length,
            lastMonthUsers.length
        );

        const orderChangePercentage=calculatePercentage(
            thisMonthOrders.length,
            lastMonthOrders.length
        );

        const revenue=allOrders.reduce((total,order)=>total+(order.total||0),0);

        const count={
            revenue:revenue,
            product:Productcount,
            user:Usercount,
            order:allOrders.length,
        };

        const orderMonthCounts= new Array(6).fill(0);
        const orderMonthRevenue=new Array(6).fill(0);

        lastsixMonthsOrders.forEach((order)=>{
            const creationDate=order.createdAt;
            const monthDiff=(today.getMonth()-creationDate.getMonth()+12)%12;

            if(monthDiff<6){
                orderMonthCounts[6-monthDiff-1]+=1;
                orderMonthRevenue[6-monthDiff-1]+=order.total;

            }
        });


        const categoryCount = await getInventories({
            categories,
            Productcount,
        });


        const UserRatio={
            male:Usercount-femaleUsers,
            female:femaleUsers,
        }

        const modifiedTransaction=latestTransactions.map((i)=>({
            _id:i._id,
            discount:i.discount,
            amount:i.total,
            quantity:i.orderItems.length,
            status:i.status,
        }));

        const changePercent={
            revenue:revenueChangePercentage,
            product:productChangePercentage,
            user:userChangePercentage,
            order:orderChangePercentage,
        }

        stats={
            categoryCount ,
            changePercent,
            count,
            chart:{
                order:orderMonthCounts,
                revenue:orderMonthRevenue,

            },
            UserRatio,
            latestTransaction:modifiedTransaction,
        }

        myCache.set("admin-stats",JSON.stringify(stats));
 
    }

    return res.status(200).json({
        success:true,
        stats,
    })
});

export const getPieCharts=TryCatch(async(req,res,next)=>{

    let charts;

    if(myCache.has("admin-pie-charts")){
        charts=JSON.parse(myCache.get("admin-pie-charts")as string);
    }
    else{

        const [
            processingOrder,
            shippedOrder,
            deliveredOrder,
            categories,
            Productcount,
            OutOfStock,
            allOrders,
            allUsers,
            adminUsers,
            customerUsers]=await Promise.all([
            Order.countDocuments({status:"Processing"}),
            Order.countDocuments({status:"Shipped"}),
            Order.countDocuments({status:"Delivered"}),  
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({stock:0}),
            Order.find({}).select(["total","discount","subtotal","tax","shippingCharges"]),
            User.find({}).select(["dob"]),
            User.countDocuments({role:"admin"}),
            User.countDocuments({role:"user"}),
        ]);

        const orderFullfillment={
            processing:processingOrder,
            shipped:shippedOrder,
            delivered:deliveredOrder,
        };

        const productCategories = await getInventories({
            categories,
            Productcount,
        });

        const stockAvailability={
            inStock:Productcount-OutOfStock,
            OutOfStock
        }

        const totalGrossIncome=allOrders.reduce((prev,order)=>prev+(order.total||0),0);

        const discount=allOrders.reduce((prev,order)=>prev+(order.discount||0),0);

        const productionCost=allOrders.reduce((prev,order)=>prev+(order.shippingCharges ||0),0);

        const burn=allOrders.reduce((prev,order)=>prev+(order.tax||0),0);

        const marketingCost=Math.round(totalGrossIncome*(30/100));

        const netMargin=totalGrossIncome-discount-productionCost-burn-marketingCost;

        const revenueDistribution={
            netMargin,
            discount,
            productionCost,
            burn,
            marketingCost,

        }

        const usersAgeGroup={
            teen:  allUsers.filter((i)=>i.age<20).length,
            adult: allUsers.filter((i)=>i.age>20 && i.age<40).length,
            old: allUsers.filter((i)=>i.age>=40).length,


        }

        const adminCustomer={
            admin:adminUsers,
            customer:customerUsers,
        }

        charts={
            orderFullfillment,
            productCategories,
            stockAvailability,
            revenueDistribution,
            adminCustomer,
            usersAgeGroup,
        };

        myCache.set("admin-pie-charts",JSON.stringify(charts) as string);

    }
    return res.status(200).json({
        success:true,
        charts,
    })

});

export const getBarCharts=TryCatch(async(req,res,next)=>{

    let charts;

    const key="admin-bar-charts";

    if(myCache.has(key)){
        charts=JSON.parse(myCache.get(key)as string);
    }
    else{

        const today=new Date();

        const sixMonthAgo=new Date();
        sixMonthAgo.setMonth(sixMonthAgo.getMonth()-6);

        const twelveMonthsAgo=new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth()-12);

        const sixMonthAgoProductPromise=Order.find({
            createdAt:{
                $gte:sixMonthAgo,
                $lte:today,
            }
        });

        const sixMonthAgoUserPromise=User.find({
            createdAt:{
                $gte:sixMonthAgo,
                $lte:today,
            }
        });

        const twelveMonthAgoOrderPromise=Order.find({
            createdAt:{
                $gte:twelveMonthsAgo,
                $lte:today,
            }
        });

        

        const [products,users,orders]=await Promise.all([
            sixMonthAgoProductPromise,
            sixMonthAgoUserPromise,
            twelveMonthAgoOrderPromise
        ]);

        const productCount=getChartData({length:6,docArr:products});
        const userCount=getChartData({length:6,docArr:users});
        const orderCount=getChartData({length:12,docArr:orders});
        

        charts={
            users:userCount,
            products:productCount,
            orders:orderCount,
        }

        myCache.set(key,JSON.stringify(charts));
    }

    return res.status(200).json({
        success:true,
        charts,
    })
});

export const getLineCharts=TryCatch(async(req,res,next)=>{
    
    let charts;

    const key="admin-line-charts";

    if(myCache.has(key)){
        charts=JSON.parse(myCache.get(key)as string);
    }
    else{

        const today=new Date();

        const sixMonthAgo=new Date();
        sixMonthAgo.setMonth(sixMonthAgo.getMonth()-6);

        const twelveMonthsAgo=new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth()-12);

        const twelveMonthAgoProductPromise=Product.find({
            createdAt:{
                $gte:twelveMonthsAgo,
                $lte:today,
            }
        }).select("createdAt");

        const twelveMonthAgoUsersPromise=User.find({
            createdAt:{
                $gte:twelveMonthsAgo,
                $lte:today,
            }
        }).select("createdAt");

       

        const twelveMonthAgoOrderPromise=Order.find({
            createdAt:{
                $gte:twelveMonthsAgo,
                $lte:today,
            }
        }).select(["createdAt","discount","total"] );

        

        const [products,users,orders]=await Promise.all([
            twelveMonthAgoProductPromise,
            twelveMonthAgoUsersPromise,
            twelveMonthAgoOrderPromise
        ]);

        const productCount=getChartData({length:12,docArr:products});
        const userCount=getChartData({length:12,docArr:users});
        const discount=getChartData({length:12,docArr:orders,property:"discount"});
        const revenue=getChartData({length:12,docArr:orders,property:"total"});
        

        charts={
            users:userCount,
            products:productCount,
            discount,
            revenue,
        }

        myCache.set(key,JSON.stringify(charts));
    }

    return res.status(200).json({
        success:true,
        charts,
    })
});









