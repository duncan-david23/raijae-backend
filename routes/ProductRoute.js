import express from 'express';
import { uploadMiddleware, addProduct , updateProduct, deleteProduct, getAllProducts, getProductById } from '../controllers/ProductController.js';

const router = express.Router();



// Plain product routes
router.get('/products/product/:id', getProductById);
router.get('/products', getAllProducts);
router.post('/products/add-product', uploadMiddleware, addProduct);
router.put('/products/product/:id', uploadMiddleware, updateProduct);
router.delete('/products/product/:id', deleteProduct);

export default router;
