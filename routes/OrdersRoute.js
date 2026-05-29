import express from "express";
import { createOrder, getOrders, updateOrderStatus, getAllOrders  } from "../controllers/OrdersController.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.get('/get-user-orders', getOrders);
router.put('/update-order-status/:orderId', updateOrderStatus);
router.get('/admin/orders', getAllOrders);

export default router;