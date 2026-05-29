import express from "express";
import { userDeliveryAddress, getUserAddresses, deleteUserAddress, updateUserAddress } from "../controllers/AddressController.js";

const router = express.Router();

router.post("/add-user-address", userDeliveryAddress);
router.get('/get-user-addresses', getUserAddresses);
router.patch('/update-user-address/:id', updateUserAddress);
router.delete('/delete-user-address/:id', deleteUserAddress);


export default router;