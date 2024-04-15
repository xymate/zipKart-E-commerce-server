import express from 'express';

import { adminOnly } from '../middlewares/auth.js';
import { allOrders, deleteOrder, getSingleOrder, myOrders, newOrder, processOrder } from '../controllers/order.js';

const app=express.Router();


app.post("/new",newOrder)

app.get("/myorders",myOrders);

app.get("/allorders",adminOnly,allOrders);

app.get("/:id",getSingleOrder);

app.put("/:id",adminOnly,processOrder);

app.delete("/:id",adminOnly,deleteOrder);

export default app;

