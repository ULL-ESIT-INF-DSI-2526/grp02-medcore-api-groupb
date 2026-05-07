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