import { describe, test, beforeEach, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Medication } from "../src/models/medication.js";
import { Record } from "../src/models/record.js";
import { Patient } from "../src/models/patients.js";
import { Staff } from "../src/models/staff.js";

beforeEach(async () => {
  await Record.deleteMany();
  await Medication.deleteMany();
  await Patient.deleteMany();
  await Staff.deleteMany();
});

describe("Pruebas de Borrado Restrictivo en Medicamentos (/medications)", () => {

  test("Debería impedir el borrado de un medicamento prescrito (Error 409)", async () => {
    const med = await new Medication({
      nombre: "Paracetamol", principioActivo: "Paracetamol", codigoNacional: "999999",
      formaFarmaceutica: "comprimido", dosisEstandar: 1000, unidadMedida: "mg",
      viaAdministracion: "oral", stock: 100, precio: 2, prescripcion: false,
      caducidadStock: new Date("2026-01-01"), contraindicaciones: []
    }).save();

    const patient = await new Patient({ 
      nombre: "Ana Lopez", fechaNacimiento: new Date(), dni: "22222222J", numSeguridadSocial: "111111111111",
      genero: "mujer", direccion: "x", telefono: "600600600", correo: "a@a.com", alergias: [], grupoSanguineo: "0+", estado: "activo"
    }).save();
    
    const staff = await new Staff({
      nombre: "Dr. Ana", numeroColegiado: "COL-999", especialidad: "otra", categoriaProfesional: "enfermero/a",
      turno: "mañana", consultaAsignada: "1", experiencia: 1, contactoDepartamento: "x", estado: "activo"
    }).save();

    await new Record({
      paciente: patient._id, medicoResponsable: staff._id, tipo: "consulta ambulatoria",
      motivo: "X", diagnostico: "X", estado: "abierto",
      medicamentosPrescritos: [{ medicamento: med._id, cantidad: 5, instruccionesAdministracion: "X" }]
    }).save();

    const response = await request(app).delete(`/medications/${med._id}`).expect(409);
    
    expect(response.body.error).toContain("se encuentra prescrito");
  });

  test("1. Crear y leer un medicamento exitosamente", async () => {
    await request(app).post("/medications").send({
      nombre: "Amoxicilina", principioActivo: "Amoxicilina", codigoNacional: "112233",
      formaFarmaceutica: "cápsula", dosisEstandar: 500, unidadMedida: "mg",
      viaAdministracion: "oral", stock: 100, precio: 3, prescripcion: true,
      caducidadStock: new Date("2026-01-01"), contraindicaciones: []
    }).expect(201);

    const getRes = await request(app).get("/medications?codigoNacional=112233").expect(200);
    expect(getRes.body[0].nombre).toBe("Amoxicilina");
  });

  test("2. Modificar un medicamento (PATCH) y validación de error", async () => {
    const m = await new Medication({
      nombre: "Ibuprofeno", principioActivo: "Ibuprofeno", codigoNacional: "555555",
      formaFarmaceutica: "comprimido", dosisEstandar: 600, unidadMedida: "mg",
      viaAdministracion: "oral", stock: 50, precio: 5, prescripcion: true,
      caducidadStock: new Date("2030-01-01"), contraindicaciones: []
    }).save();

    await request(app).patch(`/medications/${m._id}`).send({ precio: 6 }).expect(200);

    const errRes = await request(app).patch("/medications?codigoNacional=555555")
      .send({ precio: -10 }).expect(400);
    expect(errRes.body.error).toContain("no puede ser negativo");
  });

  test("3. Borrado exitoso mediante query string", async () => {
    await new Medication({
      nombre: "Aspirina", principioActivo: "AAS", codigoNacional: "777777",
      formaFarmaceutica: "comprimido", dosisEstandar: 500, unidadMedida: "mg",
      viaAdministracion: "oral", stock: 50, precio: 2, prescripcion: false,
      caducidadStock: new Date("2030-01-01"), contraindicaciones: []
    }).save();

    await request(app).delete("/medications?codigoNacional=777777").expect(200);
  });

  test("4. Fallos de Query String y 404 en Medications", async () => {
    await request(app).get("/medications").expect(400);
    await request(app).patch("/medications").expect(400);
    await request(app).delete("/medications").expect(400);

    const fakeId = "60c72b2f9b1d8b001c8e4b8a";
    await request(app).get(`/medications/${fakeId}`).expect(404);
    await request(app).patch(`/medications/${fakeId}`).send({ precio: 2 }).expect(404);
    await request(app).delete(`/medications/${fakeId}`).expect(404);
    await request(app).delete("/medications?codigoNacional=0000").expect(404);
    await request(app).patch("/medications?codigoNacional=0000").send({ precio: 2 }).expect(404);
  });
});