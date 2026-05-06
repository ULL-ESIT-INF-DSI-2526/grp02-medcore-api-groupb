import express from "express";
import { Medication } from "../models/medication.js";

export const medicationsRouter = express.Router();

// 1. CREAR (POST) un medicamento
medicationsRouter.post("/medications", async (req, res) => {
  const medicamento = new Medication(req.body);
  try {
    await medicamento.save();
    res.status(201).send(medicamento);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Función auxiliar para construir el filtro de búsqueda
const buildMedicationFilter = (query: any) => {
  if (query.nombre) return { nombre: query.nombre.toString() };
  if (query.principioActivo) return { principioActivo: query.principioActivo.toString() };
  if (query.codigoNacional) return { codigoNacional: query.codigoNacional.toString() };
  return null;
};

// 2. LEER (GET) mediante query string
medicationsRouter.get("/medications", async (req, res) => {
  const filtro = buildMedicationFilter(req.query);
  if (!filtro) {
    return res.status(400).send({ error: "Falta parámetro de búsqueda (nombre, principioActivo o codigoNacional)" });
  }

  try {
    const medicamentos = await Medication.find(filtro);
    if (medicamentos.length !== 0) res.send(medicamentos);
    else res.status(404).send();
  } catch (error) {
    res.status(500).send(error);
  }
});

// 3. LEER (GET) por ID dinámico
medicationsRouter.get("/medications/:id", async (req, res) => {
  try {
    const medicamento = await Medication.findById(req.params.id);
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error) {
    res.status(500).send(error);
  }
});

// 4. MODIFICAR (PATCH) mediante query string
medicationsRouter.patch("/medications", async (req, res) => {
  const filtro = buildMedicationFilter(req.query);
  if (!filtro) return res.status(400).send({ error: "Falta parámetro de búsqueda" });

  try {
    const medicamento = await Medication.findOneAndUpdate(filtro, req.body, { new: true, runValidators: true });
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error) {
    res.status(400).send(error);
  }
});

// 5. MODIFICAR (PATCH) por ID dinámico
medicationsRouter.patch("/medications/:id", async (req, res) => {
  try {
    const medicamento = await Medication.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error) {
    res.status(400).send(error);
  }
});

// 6. BORRAR (DELETE) mediante query string
medicationsRouter.delete("/medications", async (req, res) => {
  const filtro = buildMedicationFilter(req.query);
  if (!filtro) return res.status(400).send({ error: "Falta parámetro de búsqueda" });

  try {
    const medicamento = await Medication.findOneAndDelete(filtro);
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error) {
    res.status(500).send(error);
  }
});

// 7. BORRAR (DELETE) por ID dinámico
medicationsRouter.delete("/medications/:id", async (req, res) => {
  try {
    const medicamento = await Medication.findByIdAndDelete(req.params.id);
    if (medicamento) res.send(medicamento);
    else res.status(404).send();
  } catch (error) {
    res.status(500).send(error);
  }
});