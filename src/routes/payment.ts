import express from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { applyDiscount, createPaymentIntent, deleteCoupon, getAllCoupons, newCoupon } from '../controllers/payment.js';

const app=express.Router();

app.post("/create",createPaymentIntent);

app.post("/coupon/new",adminOnly,newCoupon);

app.get("/discount",applyDiscount);

app.get("/coupon/all",adminOnly,getAllCoupons);

app.delete("/coupon/:id",adminOnly,deleteCoupon)






export default app;