import express, { NextFunction } from "express";
import { Request,Response } from "express";
import { connectDB } from "./utils/features.js";
import NodeCache from "node-cache";

//Import Routes
import userRoute from './routes/user.js'
import { connect } from "http2";
import { errorMiddleware } from "./middlewares/error.js";
import productRoute from './routes/product.js'
import orderRoute from './routes/orders.js'
import paymentRoute from './routes/payment.js'
import dashboardRoute from "./routes/stats.js"

import { config } from "dotenv";
import morgan from "morgan";
import Stripe from "stripe";
import cors from 'cors';

config({
    path:"./.env"
})
const app=express();
app.use(express.json());

app.use(morgan("dev"));
app.use(cors());

const mongo_uri=process.env.MONGO_URI||"";
const stripeKey=process.env.STRIPE_KEY || "";

connectDB(mongo_uri);

export const myCache=new NodeCache();
export const stripe=new Stripe(stripeKey); 

const port =process.env.PORT||5000;

//Using routes
app.use("/api/v1/user",userRoute);
app.use("/api/v1/product",productRoute);
app.use("/api/v1/order",orderRoute);
app.use("/api/v1/payment",paymentRoute);
app.use("/api/v1/dashboard",dashboardRoute);




app.get('/',(req,res)=>{
    res.send("API is working")
})

app.use("/uploads",express.static("uploads"));
app.use(errorMiddleware);

app.listen(port,()=>{
    console.log(`Server is working on port ${port}`);
});