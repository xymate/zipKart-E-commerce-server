import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;

    
    console.log(shippingInfo);


    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total) {
      return next(new ErrorHandler("bhai dikkat aa rhi hai yha", 400));
    }

    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    await reduceStock(orderItems);

    await invalidateCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems.map((i) => String(i.productId)),
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
    });
  }
);

export const myOrders = TryCatch(async (req, res, next) => {
  const { id: user } = req.query;

  const key = `myorders-${user}`;

  let orders = [];

  if (myCache.has(key)) {
    orders = JSON.parse(myCache.get(key) as string);
  } else {
    orders = await Order.find({ user });
    myCache.set(key, JSON.stringify(orders));
  }

  return res.status(201).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  let orders = [];

  if (myCache.has("allorders")) {
    orders = JSON.parse(myCache.get("allorders") as string);
  } else {
    orders = await Order.find().populate("user", "name");
    myCache.set("allorders", JSON.stringify(orders));
  }

  return res.status(201).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = TryCatch(async (req, res, next) => {
  const id = req.params;

  let order;
  if (myCache.has(`order-${id}`)) {
    order = JSON.parse(myCache.get(`order-${id}`) as string);
  } else {
    order = await Order.findById(id).populate("user", "name");

    if (!order) {
      return next(new ErrorHandler("Order not found", 401));
    }

    myCache.set(`order-${id}`, JSON.stringify(order));
  }

  return res.status(201).json({
    success: true,
    order,
  });
});

export const processOrder = TryCatch(async (req, res, next) => {
  const id = req.params;

  const order = await Order.findById(id);

  if (!order) {
    return next(new ErrorHandler("order not found", 404));
  }

  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      order.status = "Delivered";
      break;
  }

  await order.save();

  await invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(201).json({
    success: true,
    message: "Order proccessed successfully",
  });
});

export const deleteOrder = TryCatch(async (req, res, next) => {
  const id = req.params;

  const order = await Order.findById(id);

  if (!order) {
    return next(new ErrorHandler("Order Not Found", 404));
  }

  await order.deleteOne();

  await invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});
