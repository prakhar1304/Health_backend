
import connectDB from "./db/index.js";
import { app } from "./app.js"
import dotenv from "dotenv"
//dotenv.config(); // No need to specify path if your .env is in the root directory
dotenv.config({ path: "./.env" });



//when  a  async  process is ende  it  return a promoise
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`port is ruunung ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log(`Moogodb connection failed-- ,  ${err}`)
    })
//callback   are  executed  when  called 