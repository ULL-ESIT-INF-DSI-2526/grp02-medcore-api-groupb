import express from "express";
import { Record } from "../models/record.js";
import { Patient } from "../models/patients.js";
import { Staff } from "../models/staff.js";
import { Medication } from "../models/medication.js";

export const recordsRouter = express.Router();

recordsRouter.post("/records", async (req, res) => {

  try {

    // Verificar existencia de paciente y medico responsable
    const paciente = await Patient.findOne({ dni: req.body.dni });
    const medicoResponsable = await Staff.findOne({ numeroColegiado: req.body.numeroColegiado});
    
    if (!paciente) {
      return res.status(404).send({ error: "Paciente no encontrado" });
    }
    if (!medicoResponsable) {
      return res.status(404).send({ error: "Médico responsable no encontrado" });
    }

    // Verificar la existencia y disponibilidad de los medicamentos

    for (const codigoNacional of req.body.medicamentos) {
      const medicamento = await Medication.findOne({ codigoNacional });
      if (!medicamento) {
        return res.status(404).send({ error: `Medicamento con ${codigoNacional} no encontrado` });
      } else {
        if (medicamento.stock > 0) {
          medicamento.stock = medicamento.stock - req.body.cantidad;
          await medicamento.save();
        } else {
          return res.status(400).send({ error: `Medicamento con ${codigoNacional} sin stock disponible` });
        }
      }
    }


  } catch (error) {
    return res.status(500).send(error);
  }
});
