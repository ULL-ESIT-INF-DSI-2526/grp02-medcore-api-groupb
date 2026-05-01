import express from "express";
import { Paciente } from "../models/paciente.js";

export const pacientesRouter = express.Router();

pacientesRouter.post("/patients", async (req, res) => {
  const paciente = new Paciente(req.body);

  try {
    await paciente.save();
    res.status(201).send(paciente);
  } catch (error) {
    res.status(500).send(error);
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
    const paciente = await Paciente.find(filtro);
    
    if (paciente.length !== 0) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

pacientesRouter.get("/patients/:id", async (req, res) => {
  try {
    const paciente = await Paciente.findById(req.params.id);

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

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
    const paciente = await Paciente.findOneAndUpdate(filtro, req.body, { new: true, runValidators: true });

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

pacientesRouter.patch("/patients/:id", async (req, res) => {
  try {
    const paciente = await Paciente.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

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
    const paciente = await Paciente.findOneAndDelete(filtro);

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

pacientesRouter.delete("/patients/:id", async (req, res) => {
  try {
    const paciente = await Paciente.findByIdAndDelete(req.params.id);

    if (paciente) {
      res.send(paciente);
    } else {
      res.status(404).send();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});