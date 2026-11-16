import express from 'express';
import { getCities, getTheatersByCity, getTheaterDetails, getRoomsByTheater} from '../controllers/location.controller.js';

const router = express.Router();

router.get('/cities', getCities);
router.get('/theaters', getTheatersByCity);
router.get('/theaters/:theaterId', getTheaterDetails);
router.get('/theaters/:theaterId/rooms', getRoomsByTheater);

export default router;
