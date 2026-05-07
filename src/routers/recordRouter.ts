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
  } catch (error) {
    return res.status(500).send(error);
  }
});

recordsRouter.get("/records", async (req, res) => {
  try {
    let filtro = {};
    if (req.query.dni) {
      filtro = { dni: req.query.dni.toString() };
      const paciente = await Patient.findOne(filtro);
      if (!paciente) { return res.status(404).send({ error: "Paciente no encontrado" }) }

      const registros = await Record.find({ paciente: paciente._id }).sort({ fechaInicio: 1 });
      res.send(registros);
    } else if (req.query.fechaInicio && req.query.fechaFin) {
      if (req.query.tipo) { 
        filtro = {
          fechaInicio: {
            $gte: new Date(req.query.fechaInicio.toString()),
            $lte: new Date(req.query.fechaFin.toString())
          },
          tipo: req.query.tipo
        };
      } else {
        filtro = {
          fechaInicio: {
            $gte: new Date(req.query.fechaInicio.toString()),
            $lte: new Date(req.query.fechaFin.toString())
          }
        };
      }

      const registros = await Record.find(filtro);
      res.send(registros);
    } else {
      res.status(400).send("Falta indicar número de identificación del paciente o un rango de fechas");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

recordsRouter.get("/records/:id", async (req, res) => {
  try {
    const registro = await Record.findById(req.params.id);
    if (registro) {
      res.send(registro);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});