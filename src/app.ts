import express from 'express';
import './db/mongoose.js';
import { pacientesRouter } from './routers/patientsRouter.js';
import { medicationsRouter } from './routers/medicationRouter.js';
import { recordsRouter } from './routers/recordRouter.js';
import { staffRouter } from './routers/staffRouter.js';

export const app = express();
app.use(express.json());
app.use(pacientesRouter);
app.use(medicationsRouter);
app.use(recordsRouter);
app.use(staffRouter);