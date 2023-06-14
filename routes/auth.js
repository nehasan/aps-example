import express from 'express';
import { getExternalToken } from '../services/aps.js';

const router = express.Router();

router.get('/token', async (req, res, next) => {
    try {
        res.json(await getExternalToken());
    } catch (err) {
        next(err);
    }
});

export default router;