import mongoose,{ Schema} from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema= new Schema({
    videoFile:{
        type:String, //cloudinary url
        required:true
    },
    thumbnail:{
        type:String,
        required:true
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    duration:{
        type:Number,
        required:true
    },
    views:{
        type:Number,
        default:0
    },
    isPublished:{
        type:Boolean,
        default:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref: "User",
        required:true
    }
},{timestamps:true})

//always add this aggrigation files over here to make it work
videoSchema.plugin(mongooseAggregatePaginate);
export const Video = Mongoose.model('Video',videoSchema)