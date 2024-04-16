import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import {
  BaseQuery,
  NewProductRequestBody,
  SearchRequestQuery,
} from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
// import {faker} from '@faker-js/faker'

export const newProduct = TryCatch(
  async (req: Request<{}, {}, NewProductRequestBody>, res, next) => {
    const { name, price, stock, category } = req.body;
    const photo = req.file;

    if (!photo) {
      return next(new ErrorHandler("Please add the photo", 400));
    }

    if (!name || !price || !category || !stock) {
      rm(photo.path, () => {
        console.log("Deleted");
      });
      return next(new ErrorHandler("Please enter all fields", 400));
    }
    const finaluri = await uploadOnCloudinary(photo?.path!)

    await Product.create({
      name,
      price,
      category: category.toLowerCase(),
      stock,
      photo: finaluri,
    });

    invalidateCache({ product: true, admin: true });

    return res.status(201).json({
      succes: true,
      message: "Product created successfully",
    });
  }
);

export const getLatestProduct = TryCatch(async (req, res, next) => {
  let products;

  //caching
  if (myCache.has("latest-products")) {
    products = JSON.parse(myCache.get("latest-products") as string);
  } else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
    myCache.set("latest-products", JSON.stringify(products));
  }

  return res.status(200).json({
    sucess: true,
    products,
  });
});

export const getAllCategories = TryCatch(async (req, res, next) => {
  let categories;
  if (myCache.has("categories")) {
    categories = JSON.parse(myCache.get("categories") as string);
  } else {
    categories = await Product.distinct("category");
    myCache.set("categories", JSON.stringify(categories));
  }

  return res.status(200).json({
    sucess: true,
    categories,
  });
});

export const getAdminProducts = TryCatch(async (req, res, next) => {
  let products;
  if (myCache.has("all-products"))
    products = JSON.parse(myCache.get("all-products") as string);
  else {
    products = await Product.find({});
    myCache.set("all-products", JSON.stringify(products));
  }

  return res.status(200).json({
    sucess: true,
    products,
  });
});

export const getSingleProduct = TryCatch(async (req, res, next) => {
  let product;

  const id = req.params.id;
  if (myCache.has(`product-${id}`)) {
    product = JSON.parse(myCache.get(`product-${id}`) as string);
  } else {
    product = await Product.findById(id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 400));
    }

    myCache.set(`product-${id}`, JSON.stringify(product));
  }

  return res.status(200).json({
    sucess: true,
    product,
  });
});

export const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { name, price, stock, category } = req.body;
  const photo = req.file;

  const product = await Product.findById(id);

  if (!product) {
    return next(new ErrorHandler("Invalid Product ID", 400));
  }

  if (photo) {
    rm(product.photo!, () => {
      console.log("Old photo Deleted");
    });

    const finaluri = await uploadOnCloudinary(photo.path);
    let url = product.photo.split("/");
    url = url[url.length - 1].split(".");
    deleteOnCloudinary(url[url.length - 2]);

    product.photo = finaluri!;
  }

  if (name) product.name = name;
  if (price) product.price = price;
  if (category) product.category = category;
  if (stock) product.stock = stock;

  await product.save();
  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(201).json({
    succes: true,
    message: "Product Updated successfully",
  });
});

export const deleteSingleProduct = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const product = await Product.findById(id);

  if (!product) {
    return next(new ErrorHandler("Invalid Product Id", 404));
  }

  let url = product.photo.split("/");
  url = url[url.length - 1].split(".");
  deleteOnCloudinary(url[url.length - 2]);


  rm(product.photo!, () => {
    console.log("Product photo deleted");
  });

  await Product.findByIdAndDelete(id);
  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    sucess: true,
    message: "Product deleted successfully",
  });
});

export const getAllProducts = TryCatch(
  async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, sort, category, price } = req.query;

    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = limit * (page - 1);

    const baseQuery: BaseQuery = {};

    if (search)
      baseQuery.name = {
        $regex: search,
        $options: "i",
      };

    if (price)
      baseQuery.price = {
        $lte: Number(price),
      };

    if (category) baseQuery.category = category;

    const [products, filteredOnlyProduct] = await Promise.all([
      Product.find(baseQuery)
        .sort(sort && { price: sort === "asc" ? 1 : -1 })
        .limit(limit)
        .skip(skip),

      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

    return res.status(200).json({
      sucess: true,
      products,
      totalPage,
    });
  }
);

// export const getRandomProducts=async(count:number=10)=>{
//     const products=[];

//     for(let i=0;i<count;i++){
//         const product={
//             name:faker.commerce.productName(),
//             photo:"uploads\\122d64cc-e24a-4502-b235-b634f4b6dc42.png",
//             price:faker.commerce.price({min:1500 ,max:80000,dec:0}),
//             stock:faker.commerce.price({min:0 ,max:100,dec:0}),
//             category:faker.commerce.department(),
//             createdAt:new Date(faker.date.past()),
//             updatedAt:new Date(faker.date.recent()),
//             _v:0,
//         };
//         products.push(product);

//     }
//     await Product.create(products);

//     console.log({success:true});
// };

// export const deleteRandomProduct=async(count:number=10)=>{
//     const products=await Product.find({}).skip(2);
//     for(let i=0;i<count;i++){
//         const product=(products[i]);
//         await product.deleteOne();
//     }
//     console.log({success:true});
// }

// deleteRandomProduct(38);
