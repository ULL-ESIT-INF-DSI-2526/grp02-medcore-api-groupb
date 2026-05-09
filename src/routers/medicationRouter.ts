import express from "express";
import { Medication } from "../models/medication.js";
import { Record } from "../models/record.js";
import QueryString from "qs";

export const medicationsRouter = express.Router();

// 1. CREAR (POST) un medicamento
medicationsRouter.post("/medications", async (req, res) => {
  const medicamento = new Medication(req.body);
  try {
    await medicamento.save();
    res.status(201).send(medicamento);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

// Función auxiliar para construir el filtro de búsqueda
const construirFiltroBusqueda = (query: QueryString.ParsedQs) => {
  let filtro = {};
  if (query.nombre) filtro = {...filtro, nombre: query.nombre.toString() };
  if (query.principioActivo) filtro = {...filtro, principioActivo: query.principioActivo.toString() };
  if (query.codigoNacional) filtro = {...filtro, codigoNacional: query.codigoNacional.toString() };
  return filtro;
};

// 2. LEER (GET) mediante query string
medicationsRouter.get("/medications", async (req, res) => {
  const filtro = construirFiltroBusqueda(req.query);
  if (Object.keys(filtro).length === 0) {
    return res.status(400).send({ error: "Falta parámetro de búsqueda (nombre, principioActivo o codigoNacional)" });
  }

  try {
    const medicamentos = await Medication.find(filtro);
    if (medicamentos.length !== 0) res.send(medicamentos);
    else res.status(404).send();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

// 3. LEER (GET) por parámetro dinámico
medicationsRouter.get("/medications/:id", async (req, res) => {
  try {
    const medicamento = await Medication.findById(req.params.id);
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

// 4. MODIFICAR (PATCH) mediante query string
medicationsRouter.patch("/medications", async (req, res) => {
  const filtro = construirFiltroBusqueda(req.query);
  if (Object.keys(filtro).length === 0) return res.status(400).send({ error: "Falta parámetro de búsqueda" });

  try {
    const medicamento = await Medication.findOneAndUpdate(filtro, req.body, { new: true, runValidators: true });
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

// 5. MODIFICAR (PATCH) por ID dinámico
medicationsRouter.patch("/medications/:id", async (req, res) => {
  try {
    const medicamento = await Medication.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

// 6. BORRAR (DELETE) mediante query string
medicationsRouter.delete("/medications", async (req, res) => {
  const filtro = construirFiltroBusqueda(req.query);
  if (Object.keys(filtro).length === 0) return res.status(400).send({ error: "Falta parámetro de búsqueda" });

  try {
    const medicamento = await Medication.findOne(filtro);
    if (!medicamento) {
      return res.status(404).send();
    } 

    const registro = await Record.findOne({ "medicamentosPrescritos.medicamento": medicamento._id });
    if (registro) {
      return res.status(409).send({
        error: "No se puede borrar el medicamento porque se encuentra prescrito"
      });
    }

    await Medication.findByIdAndDelete(medicamento._id);
    res.send(medicamento); 
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

// 7. BORRAR (DELETE) por parámetro dinámico
medicationsRouter.delete("/medications/:id", async (req, res) => {
  try {
    const medicamento = await Medication.findById(req.params.id);
    if (!medicamento) {
      return res.status(404).send();
    }

    const registro = await Record.findOne({ "medicamentosPrescritos.medicamento": req.params.id })
    if (registro) {
      return res.status(409).send({
        error: "No se puede borrar el medicamento porque se encuentra prescrito"
      });
    }

    await Medication.findByIdAndDelete(req.params.id);
    res.send(medicamento);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});