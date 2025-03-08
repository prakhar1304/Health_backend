
//rror occurring inside an async function is caught and properly handled instead of crashing the server.
//middlewaewraper
//----------------------------------------------------
// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

/*const asyncHandler = (fn) => {
    //takes  asyn fun input 
    //res and  req  obj
    //next → Function to pass control to the next middleware
  async(req , res , next)=>{
     try {
        await fn(req , res , next)
     } catch (error) {
        //res.status -->  over writing the  status  of  res  from 200 to 500
        //res.status(error.code || 500) ensures that the API returns the correct error code.
        //.json   to  get  res in json  form 
        res.status(error.code || 500).json({
            success : false,
            message : error.message
        })
     }
  }
}

export {asyncHandler}*/
//export default -->  to  export one thing

// class name  -->   capital
//fun --> camel case





//----------ya  code  samjh nhi aaya  -------------------
//-------- better  alternative  of  above  code------------------
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}


export { asyncHandler }
