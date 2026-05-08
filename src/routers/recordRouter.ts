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
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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
      if (error.name === 'ValidationError') {
        return res.status(400).send({ error: error.message });
      }
      
      return res.status(500).send({ error: error.message });
    }

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});