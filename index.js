const express = require('express');
const mongoose = require('mongoose');
const dmsRoutes = require('./routes/dms.js');
const userAuthRoutes = require("./routes/user.js")
const cors = require("cors")


const app = express();
app.use(express.json());
app.use(cors({
    origin:"https://dms-frontend-tau.vercel.app/auth/login"
}))

mongoose.connect('mongodb+srv://rajashrichougule_db_user:dqgGMUbtXU8rJoyT@cluster0.nyfa3al.mongodb.net/dms');

app.use('/api/dms', dmsRoutes);
app.use('/api/dms', userAuthRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
