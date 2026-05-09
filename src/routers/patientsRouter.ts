import express from "express";
import { Patient } from "../models/patients.js";
import { Record } from "../models/record.js";

export const pacientesRouter = express.Router();

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Crear un nuevo paciente
 *     description: Crea un nuevo paciente en el sistema con todos los datos requeridos
 *     tags:
 *       - Patients
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientCreate'
 *     responses:
 *       201:
 *         description: Paciente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
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
pacientesRouter.post("/patients", async (req, res) => {
  const paciente = new Patient(req.body);

  try {
    await paciente.save();
    res.status(201).send(paciente);
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
 * /patients:
 *   get:
 *     summary: Buscar pacientes
 *     description: Busca pacientes por nombre o DNI. Debe proporcionar al menos uno de los parámetros
 *     tags:
 *       - Patients
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: Nombre del paciente a buscar
 *         required: false
 *         schema:
 *           type: string
 *           example: Juan Perez
 *       - name: dni
 *         in: query
 *         description: DNI del paciente a buscar
 *         required: false
 *         schema:
 *           type: string
 *           example: 11111111H
 *     responses:
 *       200:
 *         description: Lista de pacientes encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Falta indicar parámetro de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falta indicar número de identificación o nombre del paciente"
 *       404:
 *         description: No se encontraron pacientes
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
pacientesRouter.get("/patients", async (req, res) => {
  let filtro = {};
  if (req.query.nombre) {
    filtro = { nombre: req.query.nombre.toString() };
  } else if (req.query.dni) {
    filtro = { dni: req.query.dni.toString() };
  } else {
    return res.status(400).send("Falta indicar número de identificación o nombre del paciente");
  }

  try {
    const paciente = await Patient.find(filtro);
    
    if (paciente.length !== 0) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
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
 * /patients/{id}:
 *   get:
 *     summary: Obtener paciente por ID
 *     description: Obtiene los datos de un paciente específico por su ID de MongoDB
 *     tags:
 *       - Patients
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del paciente
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8a
 *     responses:
 *       200:
 *         description: Datos del paciente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
pacientesRouter.get("/patients/:id", async (req, res) => {
  try {
    const paciente = await Patient.findById(req.params.id);

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
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
 * /patients:
 *   patch:
 *     summary: Actualizar paciente por query parameters
 *     description: Actualiza los datos de un paciente búsqueda por nombre o DNI
 *     tags:
 *       - Patients
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: Nombre del paciente a actualizar
 *         required: false
 *         schema:
 *           type: string
 *           example: Juan Perez
 *       - name: dni
 *         in: query
 *         description: DNI del paciente a actualizar
 *         required: false
 *         schema:
 *           type: string
 *           example: 11111111H
 *     requestBody:
 *       required: true
 *       description: Campos a actualizar del paciente
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan Pablo Perez
 *               telefono:
 *                 type: string
 *                 example: 600654321
 *               direccion:
 *                 type: string
 *                 example: Avenida Nueva 456
 *     responses:
 *       200:
 *         description: Paciente actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Falta parámetro de búsqueda o error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// MODIFICAR (PATCH) paciente mediante query string
pacientesRouter.patch("/patients", async (req, res) => {
  let filtro = {};
  if (req.query.nombre) {
    filtro = { nombre: req.query.nombre.toString() };
  } else if (req.query.dni) {
    filtro = { dni: req.query.dni.toString() };
  } else {
    return res.status(400).send("Falta indicar número de identificación o nombre del paciente");
  }

  try {
    const paciente = await Patient.findOneAndUpdate(filtro, req.body, { new: true, runValidators: true });

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
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
 * /patients/{id}:
 *   patch:
 *     summary: Actualizar paciente por ID
 *     description: Actualiza los datos de un paciente específico por su ID
 *     tags:
 *       - Patients
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del paciente a actualizar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8a
 *     requestBody:
 *       required: true
 *       description: Campos a actualizar del paciente
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan Pablo Perez
 *               telefono:
 *                 type: string
 *                 example: 600654321
 *     responses:
 *       200:
 *         description: Paciente actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// MODIFICAR (PATCH) paciente mediante ID dinámico 
pacientesRouter.patch("/patients/:id", async (req, res) => {
  try {
    const paciente = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
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
 * /patients:
 *   delete:
 *     summary: Eliminar paciente por query parameters
 *     description: Elimina un paciente y todos sus registros médicos asociados. Se busca por nombre o DNI
 *     tags:
 *       - Patients
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: Nombre del paciente a eliminar
 *         required: false
 *         schema:
 *           type: string
 *           example: Juan Perez
 *       - name: dni
 *         in: query
 *         description: DNI del paciente a eliminar
 *         required: false
 *         schema:
 *           type: string
 *           example: 11111111H
 *     responses:
 *       200:
 *         description: Paciente eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Falta parámetro de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falta indicar número de identificación o nombre del paciente"
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Justificar decisión de borrar todos los registros asociados al paciente en la documentación
pacientesRouter.delete("/patients", async (req, res) => {
  let filtro = {};
  if (req.query.nombre) {
    filtro = { nombre: req.query.nombre.toString() };
  } else if (req.query.dni) {
    filtro = { dni: req.query.dni.toString() };
  } else {
    return res.status(400).send("Falta indicar número de identificación o nombre del paciente");
  }

  try {
    const paciente = await Patient.findOne(filtro);
    if (!paciente) {
      return res.status(404).send();
    }

    await Record.deleteMany({ paciente: paciente._id });
    await Patient.findByIdAndDelete(paciente._id); 
    res.send(paciente); 
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
 * /patients/{id}:
 *   delete:
 *     summary: Eliminar paciente por ID
 *     description: Elimina un paciente específico y todos sus registros médicos asociados
 *     tags:
 *       - Patients
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del paciente a eliminar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8a
 *     responses:
 *       200:
 *         description: Paciente eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Paciente no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
pacientesRouter.delete("/patients/:id", async (req, res) => {
  try {
    const paciente = await Patient.findById(req.params.id);
    if (!paciente) {
      return res.status(404).send();
    }

    await Record.deleteMany({ paciente: paciente._id });
    await Patient.findByIdAndDelete(paciente._id); 
    res.send(paciente);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});