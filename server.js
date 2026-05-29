import express from 'express';
import cors from 'cors';
// import imageUploadRoute from './routes/imageUploadRoute.js';
import AccountProfileRoute from './routes/AccountProfileRoute.js';
import AddressRoute from './routes/AddressRoute.js';
import OrdersRoute from './routes/OrdersRoute.js';
// import messageRoute from './routes/messageRoute.js';
import productRoute from './routes/ProductRoute.js';
import profileRoute from './routes/ProfileRoute.js';




const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/api/users', imageUploadRoute);
app.use('/api/users', AccountProfileRoute);
app.use('/api/users', AddressRoute);
app.use('/api/users', OrdersRoute);
app.use('/api/users', productRoute);
app.use('/api/users', profileRoute);
// app.use('/api/users', messageRoute);


// Sample route
app.get('/', (req, res) => {
  res.send('Hello from the backend server!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://172.20.10.3:${PORT}`);
});