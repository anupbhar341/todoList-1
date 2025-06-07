import mongoose from "mongoose";

const summarySchema = new mongoose.Schema({
    summary: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
});

const SummaryModel = mongoose.model('summary', summarySchema);
export default SummaryModel; 