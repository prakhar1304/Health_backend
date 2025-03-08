class ApiError  extends Error {

    constructor(
        statusCode ,
        message ="Something is wrong",
        errors = [],
        stack = ""
    ){
        super(message)//message  of  parent 
        this.statusCode = statusCode
        this.data = null //to store extra details related to the error.
        this.message = message
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
        //property in an error object contains the stack trace, which is a list of function calls that led to the error.
        
    }
}

export { ApiError };
