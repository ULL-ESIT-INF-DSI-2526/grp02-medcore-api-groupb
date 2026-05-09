import express from "express";
import { Staff } from "../models/staff.js"; // Asegúrate de que la ruta coincida con donde guardaste staff.ts
import { Record } from "../models/record.js";

export const staffRouter = express.Router();

/**
 * @swagger
 * /staff:
 *   post:
 *     summary: Crear un nuevo miembro del personal
 *     description: Crea un nuevo miembro del personal médico en el sistema
 *     tags:
 *       - Staff
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StaffCreate'
 *     responses:
 *       201:
 *         description: Miembro del personal creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
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
// 1. CREAR (POST) un nuevo miembro del personal
staffRouter.post("/staff", async (req, res) => {
  const staffMember = new Staff(req.body);

  try {
    await staffMember.save();
    res.status(201).send(staffMember);
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
 * /staff:
 *   get:
 *     summary: Buscar miembros del personal
 *     description: Busca miembros del personal por nombre o especialidad. Debe proporcionar al menos uno de los parámetros
 *     tags:
 *       - Staff
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: Nombre del miembro del personal
 *         required: false
 *         schema:
 *           type: string
 *           example: Dr. Carlos López
 *       - name: especialidad
 *         in: query
 *         description: Especialidad del miembro del personal
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["medicina general", "cardiología", "traumatología", "pediatría", "oncología", "urgencias", "otra"]
 *           example: cardiología
 *     responses:
 *       200:
 *         description: Lista de miembros del personal encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Falta indicar parámetro de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: No se encontraron miembros del personal
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 2. LEER (GET) personal mediante query string (?nombre=... o ?especialidad=...)
staffRouter.get("/staff", async (req, res) => {
  let filtro = {};
  
  if (req.query.nombre) {
    filtro = { nombre: req.query.nombre.toString() };
  } else if (req.query.especialidad) {
    filtro = { especialidad: req.query.especialidad.toString() };
  } else {
    return res.status(400).send("Falta indicar el nombre o la especialidad del personal médico");
  }

  try {
    const staffMembers = await Staff.find(filtro);
    
    if (staffMembers.length !== 0) {
      res.send(staffMembers);
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
 * /staff/{id}:
 *   get:
 *     summary: Obtener miembro del personal por ID
 *     description: Obtiene los datos de un miembro del personal específico por su ID
 *     tags:
 *       - Staff
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del miembro del personal
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8d
 *     responses:
 *       200:
 *         description: Datos del miembro del personal encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Miembro del personal no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 3. LEER (GET) personal por su ID dinámico en la URL
staffRouter.get("/staff/:id", async (req, res) => {
  try {
    const staffMember = await Staff.findById(req.params.id);

    if (staffMember) {
      res.send(staffMember);
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
 * /staff:
 *   patch:
 *     summary: Actualizar miembro del personal por query parameters
 *     description: Actualiza los datos de un miembro del personal por búsqueda en query parameters
 *     tags:
 *       - Staff
 *     parameters:
 *       - name: nombre
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: especialidad
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
 *               turno:
 *                 type: string
 *                 example: "tarde"
 *               consultaAsignada:
 *                 type: string
 *                 example: "Consulta 7"
 *               estado:
 *                 type: string
 *                 enum: ["activo", "inactivo"]
 *                 example: "activo"
 *     responses:
 *       200:
 *         description: Miembro del personal actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Falta parámetro de búsqueda o error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Miembro del personal no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 4. MODIFICAR (PATCH) personal mediante query string
staffRouter.patch("/staff", async (req, res) => {
  let filtro = {};
  
  if (req.query.nombre) {
    filtro = { nombre: req.query.nombre.toString() };
  } else if (req.query.especialidad) {
    filtro = { especialidad: req.query.especialidad.toString() };
  } else {
    return res.status(400).send("Falta indicar el nombre o la especialidad del personal médico");
  }

  try {
    const staffMember = await Staff.findOneAndUpdate(filtro, req.body, { new: true, runValidators: true });

    if (staffMember) {
      res.send(staffMember);
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
 * /staff/{id}:
 *   patch:
 *     summary: Actualizar miembro del personal por ID
 *     description: Actualiza los datos de un miembro del personal específico por su ID
 *     tags:
 *       - Staff
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del miembro del personal a actualizar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8d
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               turno:
 *                 type: string
 *                 example: "tarde"
 *               consultaAsignada:
 *                 type: string
 *                 example: "Consulta 7"
 *               estado:
 *                 type: string
 *                 enum: ["activo", "inactivo"]
 *                 example: "activo"
 *     responses:
 *       200:
 *         description: Miembro del personal actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Miembro del personal no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 5. MODIFICAR (PATCH) personal por su ID dinámico
staffRouter.patch("/staff/:id", async (req, res) => {
  try {
    const staffMember = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (staffMember) {
      res.send(staffMember);
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
 * /staff:
 *   delete:
 *     summary: Eliminar miembro del personal por query parameters
 *     description: Elimina un miembro del personal si no tiene registros médicos asociados. Se recomienda cambiar el estado a inactivo para personal con historiales
 *     tags:
 *       - Staff
 *     parameters:
 *       - name: nombre
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: especialidad
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Miembro del personal eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Falta parámetro de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Miembro del personal no encontrado
 *       409:
 *         description: El personal tiene historiales asignados y no puede ser eliminado
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
// Justificar decisión de mantener los registros asociados y la sugerencia de cambiar el estado a inactivo en la documentación
// 6. BORRAR (DELETE) personal mediante query string
staffRouter.delete("/staff", async (req, res) => {
  let filtro = {};
  
  if (req.query.nombre) {
    filtro = { nombre: req.query.nombre.toString() };
  } else if (req.query.especialidad) {
    filtro = { especialidad: req.query.especialidad.toString() };
  } else {
    return res.status(400).send("Falta indicar el nombre o la especialidad del personal médico");
  }

  try {
    const staffMember = await Staff.findOne(filtro);
    if (!staffMember) {
      return res.status(404).send();
    }

    const registros = await Record.findOne({ medicoResponsable: staffMember._id });
    if (registros) {
      return res.status(409).send({
        error: "El personal médico que intenta borrar tiene historiales asignados, cambie su estado a 'inactivo' en lugar de borrarlo"
      });
    }

    await Staff.findByIdAndDelete(staffMember._id);
    res.send(staffMember);
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
 * /staff/{id}:
 *   delete:
 *     summary: Eliminar miembro del personal por ID
 *     description: Elimina un miembro del personal si no tiene registros médicos asociados. Se recomienda cambiar el estado a inactivo para personal con historiales
 *     tags:
 *       - Staff
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del miembro del personal a eliminar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8d
 *     responses:
 *       200:
 *         description: Miembro del personal eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Miembro del personal no encontrado
 *       409:
 *         description: El personal tiene historiales asignados y no puede ser eliminado
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
// 7. BORRAR (DELETE) personal por su ID dinámico
staffRouter.delete("/staff/:id", async (req, res) => {
  try {
    const staffMember = await Staff.findById(req.params.id);
    if (!staffMember) {
      return res.status(404).send();
    }

    const registros = await Record.findOne({ medicoResponsable: staffMember._id });
    if (registros) {
      return res.status(409).send({
        error: "El personal médico que intenta borrar tiene historiales asignados, cambie su estado a 'inactivo' en lugar de borrarlo"
      });
    }

    await Staff.findByIdAndDelete(staffMember._id);
    res.send(staffMember);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});