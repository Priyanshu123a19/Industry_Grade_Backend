import mongoose, { Schema } from 'mongoose';

//here we will be making the schema for the subscriber

const subscriberSchema = new Schema({
    subscriber : {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    }
},{timestamps: true});

//exporting the subscriber model
export const Subscription = mongoose.model('Subscription', subscriberSchema);