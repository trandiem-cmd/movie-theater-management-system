import express from 'express';
import { getCities, getTheatersByCity, getTheaterDetails, getRoomsByTheater} from '../controllers/location.controller.js';

const router = express.Router();

router.get('/cities', getCities);
router.get('/theaters', getTheatersByCity);
router.get('/:theaterId', getTheaterDetails);
router.get('/:theaterId/rooms', getRoomsByTheater);

export default router;
