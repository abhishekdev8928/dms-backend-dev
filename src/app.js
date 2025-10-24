import express from "express";
import cors from "cors";
import NodeRoutes from "./routes/NodeRoutes.js";
const app = express();
import fileRoutes from "../src/routes/fileRoutes.js"
import authRoutes from "../src/routes/userRoutes.js"
import  permissionRoutes  from "../src/routes/permissionRoutes.js";
import { config } from "./config/config.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";





app.use(cors());

app.use(express.json());

app.use("/api", NodeRoutes);           // Node routes (departments, categories, etc.)
app.use("/api/files", fileRoutes);    // File routes
app.use("/api/auth",authRoutes)
app.use("/api/permissions",permissionRoutes)



app.use(globalErrorHandler);

// ===== TEST ROUTES =====
app.get("/", (req, res) => {
  res.json({ message: "Server running" });
});


export default app;
