import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import todoRoute from "./routes/todo.route.js";
import userRoute from "./routes/user.route.js";
import summaryRoute from "./routes/summary.route.js";
import cors from "cors";

const app = express();
dotenv.config();

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());

// Database connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://soumyo:ss123456@cluster0.bk9aovi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(DB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Routes
app.use("/todo", todoRoute);
app.use("/user", userRoute);
app.use("/summary", summaryRoute);

app.get('/', (req, res) => {
  res.send('TODO App');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const port = process.env.PORT ;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
