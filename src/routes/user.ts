import express from 'express';
import { deleteUser, newUser } from '../controllers/user.js';
import { getAllUsers } from '../controllers/user.js';
import { getUser } from '../controllers/user.js';
import { adminOnly } from '../middlewares/auth.js';

const app=express.Router();


app.post("/new",newUser)

app.get("/all",adminOnly,getAllUsers);

app.get("/:id",getUser);

app.delete("/:id",adminOnly,deleteUser);

export default app;