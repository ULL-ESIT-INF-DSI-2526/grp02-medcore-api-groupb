import express from "express";
import { Patient } from "../models/patients.js";
import { Record } from "../models/record.js";

export const pacientesRouter = express.Router();

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

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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

    return res.status(500).send({ error: "Ha ocurrido un error inesperado en el servidor" });
  }
});

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

    await Record.deleteMany({ patient: paciente._id });
    await Patient.findByIdAndDelete(paciente._id); 
    res.send(paciente); 
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

pacientesRouter.delete("/patients/:id", async (req, res) => {
  try {
    const paciente = await Patient.findById(req.params.id);
    if (!paciente) {
      return res.status(404).send();
    }

    await Record.deleteMany({ patient: paciente._id });
    await Patient.findByIdAndDelete(paciente._id); 
    res.send(paciente);
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