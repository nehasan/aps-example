import express from 'express';
import { PORT } from './config.js';
import rootRouter from './routes/root.js';
import authRouter from './routes/auth.js';
import modelsRouter from './routes/models.js';

const app = express();
app.use(express.static('pages'));
app.use('/', rootRouter);
app.use('/api/auth/', authRouter);
app.use('/api/models/', modelsRouter);
app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });