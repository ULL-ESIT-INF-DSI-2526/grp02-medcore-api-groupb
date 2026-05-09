import express from "express";
import { Medication } from "../models/medication.js";
import { Record } from "../models/record.js";
import QueryString from "qs";

export const medicationsRouter = express.Router();

/**
 * @swagger
 * /medications:
 *   post:
 *     summary: Crear un nuevo medicamento
 *     description: Crea un nuevo medicamento en el sistema
 *     tags:
 *       - Medications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MedicationCreate'
 *     responses:
 *       201:
 *         description: Medicamento creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medication'
 *       400:
 *         description: Error de validación en los datos proporcionados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /medications:
 *   get:
 *     summary: Buscar medicamentos
 *     description: Busca medicamentos por nombre, principio activo o código nacional. Debe proporcionar al menos uno de los parámetros
 *     tags:
 *       - Medications
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: Nombre del medicamento
 *         required: false
 *         schema:
 *           type: string
 *           example: Ibuprofeno
 *       - name: principioActivo
 *         in: query
 *         description: Principio activo del medicamento
 *         required: false
 *         schema:
 *           type: string
 *           example: Ibuprofeno
 *       - name: codigoNacional
 *         in: query
 *         description: Código nacional del medicamento
 *         required: false
 *         schema:
 *           type: string
 *           example: 123456
 *     responses:
 *       200:
 *         description: Lista de medicamentos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medication'
 *       400:
 *         description: Falta parámetro de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No se encontraron medicamentos
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /medications/{id}:
 *   get:
 *     summary: Obtener medicamento por ID
 *     description: Obtiene los datos de un medicamento específico por su ID
 *     tags:
 *       - Medications
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del medicamento
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8b
 *     responses:
 *       200:
 *         description: Datos del medicamento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medication'
 *       404:
 *         description: Medicamento no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /medications:
 *   patch:
 *     summary: Actualizar medicamento por query parameters
 *     description: Actualiza los datos de un medicamento por búsqueda en query parameters
 *     tags:
 *       - Medications
 *     parameters:
 *       - name: nombre
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: principioActivo
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: codigoNacional
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stock:
 *                 type: integer
 *                 example: 75
 *               precio:
 *                 type: number
 *                 example: 6.50
 *     responses:
 *       200:
 *         description: Medicamento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medication'
 *       400:
 *         description: Falta parámetro de búsqueda o error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Medicamento no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /medications/{id}:
 *   patch:
 *     summary: Actualizar medicamento por ID
 *     description: Actualiza los datos de un medicamento específico por su ID
 *     tags:
 *       - Medications
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del medicamento a actualizar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8b
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stock:
 *                 type: integer
 *                 example: 75
 *               precio:
 *                 type: number
 *                 example: 6.50
 *     responses:
 *       200:
 *         description: Medicamento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medication'
 *       404:
 *         description: Medicamento no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /medications:
 *   delete:
 *     summary: Eliminar medicamento por query parameters
 *     description: Elimina un medicamento si no se encuentra prescrito en ningún registro
 *     tags:
 *       - Medications
 *     parameters:
 *       - name: nombre
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: principioActivo
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: codigoNacional
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medicamento eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medication'
 *       400:
 *         description: Falta parámetro de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Medicamento no encontrado
 *       409:
 *         description: El medicamento está prescrito y no puede eliminarse
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /medications/{id}:
 *   delete:
 *     summary: Eliminar medicamento por ID
 *     description: Elimina un medicamento si no se encuentra prescrito en ningún registro
 *     tags:
 *       - Medications
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del medicamento a eliminar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8b
 *     responses:
 *       200:
 *         description: Medicamento eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medication'
 *       404:
 *         description: Medicamento no encontrado
 *       409:
 *         description: El medicamento está prescrito y no puede eliminarse
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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