import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // Allowing requests only from the specified origin in the environment variable.
    credentials: true, // Enabling credentials (cookies, authorization headers, etc.) to be included in requests.
  })
);

// Middleware to parse incoming JSON requests with a size limit of 16KB
app.use(express.json({ limit: "16kb" }));

// Middleware to parse URL-encoded data with a size limit of 16KB
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Middleware to serve static files from the "public" directory
app.use(express.static("public"));

// Middleware to parse cookies
app.use(cookieParser());

//import routes
import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);

export { app };
