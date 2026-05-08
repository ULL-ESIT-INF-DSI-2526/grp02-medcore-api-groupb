import express from 'express';

export const defaultRouter = express.Router();

defaultRouter.all('/(.*)', (req, res) => {
  res.status(404).send({ 
    error: `La ruta ${req.originalUrl} no existe` 
  });
});