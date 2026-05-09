import express from "express";
import { Staff } from "../models/staff.js"; // Asegúrate de que la ruta coincida con donde guardaste staff.ts
import { Record } from "../models/record.js";

export const staffRouter = express.Router();

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