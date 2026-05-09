import express from "express";
import { Record } from "../models/record.js";
import { Patient } from "../models/patients.js";
import { Staff } from "../models/staff.js";
import { Medication } from "../models/medication.js";

export const recordsRouter = express.Router();

async function validarPaciente(dni: string) {
  const paciente = await Patient.findOne({ dni });
  if (!paciente) { throw new Error(`El paciente con dni ${dni} no existe.`) }
  return paciente._id;
}

async function validarMedico(numeroColegiado: string) {
  const medico = await Staff.findOne({ numeroColegiado, estado: "activo" });
  if (!medico) { throw new Error(`El médico con número de colegiado ${numeroColegiado} no existe o se encuentra inactivo`) }
  return medico._id;
}

async function verificarMedicaciones(medicaciones: { codigoNacional: string, cantidad: number, instruccionesAdministracion: string }[]) {
  let total = 0;
  const medicacionesPrescritas: unknown[] = [];

  for (const item of medicaciones) {
    const medicamento = await Medication.findOne({ codigoNacional: item.codigoNacional });
    if (!medicamento) { throw new Error(`El medicamento con código ${item.codigoNacional} no existe.`); }
    if (medicamento.stock < item.cantidad) { throw new Error(`Stock insuficiente para ${medicamento.nombre}`); }

    if (medicamento.caducidadStock < new Date()) {
      throw new Error(`El medicamento ${medicamento.nombre} está caducado y no puede ser prescrito.`);
    }

    // Importe total
    total += medicamento.precio * item.cantidad;

    medicacionesPrescritas.push({
      medicamento: medicamento._id,
      cantidad: item.cantidad,
      instruccionesAdministracion: item.instruccionesAdministracion
    });

    // Actualizar stock
    medicamento.stock -= item.cantidad;
    await medicamento.save();
  }

  return { total, medicacionesPrescritas };
}

/**
 * @swagger
 * /records:
 *   post:
 *     summary: Crear un nuevo registro médico
 *     description: Crea un nuevo registro médico para un paciente con medicamentos prescritos
 *     tags:
 *       - Records
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecordCreate'
 *     responses:
 *       201:
 *         description: Registro médico creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
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
recordsRouter.post("/records", async (req, res) => {
  try {
    const { dniPaciente, numeroColegiadoMedico, medicamentos, tipo, fechaInicio, fechaFin, motivo, diagnostico, estado } = req.body;
    const pacienteId = await validarPaciente(dniPaciente);
    const medicoId = await validarMedico(numeroColegiadoMedico);
    const { total, medicacionesPrescritas } = await verificarMedicaciones(medicamentos)
    const record = new Record({
      paciente: pacienteId,
      medicoResponsable: medicoId,
      tipo: tipo,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      motivo: motivo,
      diagnostico: diagnostico,
      estado: estado,
      medicamentosPrescritos: medicacionesPrescritas,
      costeTotalMedicamentos: total
    });

    await record.save();
    res.status(201).send(record);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError' || error.name === 'Error') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /records/paciente:
 *   get:
 *     summary: Obtener registros de un paciente
 *     description: Obtiene todos los registros médicos asociados a un paciente por su DNI
 *     tags:
 *       - Records
 *     parameters:
 *       - name: dni
 *         in: query
 *         description: DNI del paciente
 *         required: true
 *         schema:
 *           type: string
 *           example: 11111111H
 *     responses:
 *       200:
 *         description: Lista de registros del paciente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Record'
 *       400:
 *         description: Falta proporcionar el DNI del paciente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Paciente no encontrado
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
recordsRouter.get("/records/paciente", async (req, res) => {
  try {
    if (!req.query.dni) {
      return res.status(400).send({ error: "Debe proporcionar el DNI del paciente" });
    }

    const paciente = await Patient.findOne({ dni: req.query.dni.toString() });
    if (!paciente) {
      return res.status(404).send({ error: "Paciente no encontrado" });
    }

    const registros = await Record.find({ paciente: paciente._id }).sort({ fechaInicio: 1 });
    res.send(registros);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError' || error.name === 'Error') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /records/fechas:
 *   get:
 *     summary: Obtener registros por rango de fechas
 *     description: Obtiene registros médicos dentro de un rango de fechas, opcionalmente filtrados por tipo
 *     tags:
 *       - Records
 *     parameters:
 *       - name: fechaInicio
 *         in: query
 *         description: Fecha de inicio (ISO 8601)
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2023-10-01T00:00:00.000Z"
 *       - name: fechaFin
 *         in: query
 *         description: Fecha de fin (ISO 8601)
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2023-10-31T23:59:59.999Z"
 *       - name: tipo
 *         in: query
 *         description: Tipo de registro (opcional)
 *         required: false
 *         schema:
 *           type: string
 *           example: "consulta ambulatoria"
 *     responses:
 *       200:
 *         description: Lista de registros encontrados en el rango de fechas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Record'
 *       400:
 *         description: Falta proporcionar fechaInicio y fechaFin
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
recordsRouter.get("/records/fechas", async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).send({ error: "Debe proporcionar fechaInicio y fechaFin" });
    }

    let filtro = {};
    if (tipo) {
      filtro = {
        fechaInicio: {
          $gte: new Date(fechaInicio.toString()),
          $lte: new Date(fechaFin.toString())
        },
        tipo: tipo.toString()
      };
    } else {
      filtro = {
        fechaInicio: {
          $gte: new Date(fechaInicio.toString()),
          $lte: new Date(fechaFin.toString())
        },
      };
    }

    const registros = await Record.find(filtro).sort({ fechaInicio: 1 });
    res.send(registros);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError' || error.name === 'Error') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /records/{id}:
 *   get:
 *     summary: Obtener registro por ID
 *     description: Obtiene un registro médico específico por su ID
 *     tags:
 *       - Records
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del registro médico
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8c
 *     responses:
 *       200:
 *         description: Datos del registro médico encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
recordsRouter.get("/records/:id", async (req, res) => {
  try {
    const registro = await Record.findById(req.params.id);
    if (registro) {
      res.send(registro);
    } else {
      res.status(404).send();
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError' || error.name === 'Error') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /records/{id}:
 *   patch:
 *     summary: Actualizar registro médico
 *     description: Actualiza los datos de un registro médico. Si se actualizan los medicamentos, se ajusta automáticamente el stock
 *     tags:
 *       - Records
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del registro a actualizar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8c
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 example: "Revisión de migraña"
 *               diagnostico:
 *                 type: string
 *                 example: "Migraña tratada"
 *               estado:
 *                 type: string
 *                 example: "cerrado"
 *               medicamentos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     codigoNacional:
 *                       type: string
 *                     cantidad:
 *                       type: integer
 *                     instruccionesAdministracion:
 *                       type: string
 *     responses:
 *       200:
 *         description: Registro actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
recordsRouter.patch("/records/:id", async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).send();
    }

    //restaurar el stock de los medicamentos prescritos originalmente si se modifican
    if (req.body.medicamentos) {
      for (const item of record.medicamentosPrescritos) {
        const medicamento = await Medication.findById(item.medicamento);
        if (medicamento) {
          medicamento.stock += item.cantidad;
          await medicamento.save();
        }
      }
      //usar funcion verificar medicamento para validar y actuializar el stock de los nuevos medicamentos prescritos (tmb se actualiza el costo)
      const {total, medicacionesPrescritas} = await verificarMedicaciones(req.body.medicamentos);

      req.body.costeTotalMedicamentos = total;
      req.body.medicamentosPrescritos = medicacionesPrescritas;

      delete req.body.medicamentos;
    }

    if (req.body.dniPaciente) {
      req.body.paciente = await validarPaciente(req.body.dniPaciente);
    }
    if (req.body.numeroColegiadoMedico) {
      req.body.medicoResponsable = await validarMedico(req.body.numeroColegiadoMedico);
    }    
    
    const recordActualizado = await Record.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    res.send(recordActualizado);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError' || error.name === 'Error') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /records/{id}:
 *   delete:
 *     summary: Eliminar registro médico
 *     description: Elimina un registro médico y restaura el stock de los medicamentos prescritos
 *     tags:
 *       - Records
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID del registro a eliminar
 *         required: true
 *         schema:
 *           type: string
 *           example: 60c72b2f9b1d8b001c8e4b8c
 *     responses:
 *       200:
 *         description: Registro eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Record'
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
recordsRouter.delete("/records/:id", async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).send();
    }

    // actualizar stock
    for (const item of record.medicamentosPrescritos) {
      const medicamento = await Medication.findById(item.medicamento);
      if (medicamento) {
        medicamento.stock += item.cantidad;
        await medicamento.save();
      }
    }

    // eliminar registro
    await Record.findByIdAndDelete(req.params.id);

    res.send(record);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError' || error.name === 'Error') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }
  }
});