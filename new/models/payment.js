import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resident",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityManager",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDeadline: {
      type: String,
      default: Date.now().toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    },
    paymentDate: {
      type: String,
    },
    paymentMethod: {
      type: String,
      default: "None",
    },
    status: {
      type: String,
      default: "Pending",
    },
    remarks: {
      type: String,
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
    },
    ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
    },
    belongTo: String,
    belongToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resident" || "Issue" || "commonSpaces",
    },
  },
  { timestamps: true }
);
const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
