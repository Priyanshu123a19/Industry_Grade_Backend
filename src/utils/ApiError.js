class ApiError extends Error {
    constructor(
        statusCode ,
        message="something went wrong",
        errors=[],
        stack=""
    ){
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.errors = errors
        this.data = null
        this.sucess = false

        //this is done to ensure that the error stack that is what file contains what error is shown.
        if(stack) {
            this.stack = stack;
        }
        Error.captureStackTrace(this, this.constructor);
    }
}

export {ApiError}