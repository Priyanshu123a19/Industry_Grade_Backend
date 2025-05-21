import dotenv from 'dotenv';
import connectDB from './db/index.js';
import {app} from './app.js';

dotenv.config({ path: './env' });

connectDB()
.then(()=>{
    app.on('error', (err) => {
        console.error('Application-level error:', err);
        throw err;
    });
    
    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((error)=>{
    console.error('Connection to mongoDB failed!!!', error.message);
})
//establlishing the cconnectoin for the server

/*const app = express();
(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on('error', (err) => {
            console.log('Error connecting to MongoDB:', err);
            throw err;
    })

    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    })
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}
)();
*/