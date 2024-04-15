import express from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { deleteSingleProduct, getAdminProducts, getAllCategories, getAllProducts, getLatestProduct, getSingleProduct, newProduct, updateProduct } from '../controllers/product.js';
import { singleUpload } from '../middlewares/multer.js';

const app=express.Router();

app.post("/new",adminOnly,singleUpload,newProduct);

app.get("/all",getAllProducts)

app.get("/latest",getLatestProduct);

app.get("/categories",getAllCategories);

app.get("/adminproducts",adminOnly,getAdminProducts);

app
    .route("/:id")
    .get(getSingleProduct)
    .put(adminOnly,singleUpload,updateProduct)
    .delete(adminOnly,deleteSingleProduct); 


export default app;