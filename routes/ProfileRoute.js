import express from 'express';
import { insertProfile, checkUserRole, getProfile, updateProfile, getAllProfiles } from '../controllers/ProfileController.js';

const router = express.Router();

router.post('/profile/add-profile', insertProfile);
router.get('/profile/check-role', checkUserRole);
router.get('/get-profile', getProfile);
router.put('/profile/update-profile', updateProfile);
router.get('/profile/get-all-profiles', getAllProfiles);

export default router;
