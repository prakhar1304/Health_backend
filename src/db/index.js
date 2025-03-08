import mongoose from "mongoose";
import { DB_NAME } from "../constansts.js";

const connectDB =  async () => {

    try {
        const connectdb = await mongoose.connect(`${process.env.MONGO_DB_URl}/${DB_NAME}`)
        console.log(`Moogodb connected: ${connectdb.connection.host}`)
        // where your MongoDB instance is hosted.
    } catch (error) {
        console.log(`Moogodb  conncetio  failed ${error}`);
        process.exit(1)//stop the process
        //process.exit() is a method to stop the execution of the program.
        //The argument 1 indicates that the process is exiting with an error. 
       // Typically, 0 indicates successful execution
    }
}

export  default connectDB;