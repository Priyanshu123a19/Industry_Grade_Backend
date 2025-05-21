const asyncHandler = (requestHandler)=> {
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>
            next(err))
    }
}

export {asyncHandler}

//new try and catch method for async functions

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         //here we send the error code and also ensure that a json object containing the info on the error is also passed
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message || "Internal Server Error",
//         });
//         next(error);
//     }
// }
