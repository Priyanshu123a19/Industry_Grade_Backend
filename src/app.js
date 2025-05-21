import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app=express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))

app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static('public'));
app.use(cookieParser());

//importing the routes
import userRouter from "./routes/user.routes.js";

//routes declareation
//(what happens over here is that we are stardizing all routes for the user to be under /users...
// now whenver the user routes will be called the user.routes will be called and over there we will complete the url by adding the method that we want to call from the user.route
// so teh final url will be like http://localhost:5000/users/(method name eg..register,login etc...)
//tjhe /api/v1/users is the base url for all the user routes and is written like this to make the versioning of the api easier in the future
app.use("/api/v1/users",userRouter);


export {app};