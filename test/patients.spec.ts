import { describe, test, beforeEach, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Patient } from "../src/models/patients.js";
import { Record } from "../src/models/record.js";
import { Staff } from "../src/models/staff.js";

const testPatient = {
  nombre: "Carlos Sanchez", fechaNacimiento: new Date("1985-05-05"), dni: "12345678Z",
  numSeguridadSocial: "123456789012", genero: "hombre", direccion: "Calle 1",
  telefono: "600111222", correo: "carlos@example.com", alergias: [], grupoSanguineo: "A+", estado: "activo"
};

beforeEach(async () => {
  await Patient.deleteMany();
  await Record.deleteMany();
  await Staff.deleteMany();
});

describe("Pruebas sobre Pacientes (/patients)", () => {
  test("1. Crear un paciente correctamente", async () => {
    await request(app).post("/patients").send(testPatient).expect(201);
  });

  test("2. Fallo de validación (400) por DNI incorrecto", async () => {
    const response = await request(app).post("/patients")
      .send({ ...testPatient, dni: "dni-falso" }).expect(400);
    expect(response.body.error).toContain("dni introducido no es válido");
  });

  test("3. Leer paciente por query string y por ID", async () => {
    const p = await new Patient(testPatient).save();
    
    await request(app).get(`/patients?dni=${p.dni}`).expect(200);
    await request(app).get(`/patients/${p._id}`).expect(200);
    await request(app).get("/patients").expect(400);
  });

  test("4. Error 404 al buscar o modificar paciente inexistente", async () => {
    await request(app).get("/patients?dni=00000000T").expect(404);
    await request(app).patch("/patients/60c72b2f9b1d8b001c8e4b8a").send({ direccion: "Nueva" }).expect(404);
  });

  test("5. Error 500 al enviar un ID malformado (CastError)", async () => {
    await request(app).get("/patients/123-id-falso").expect(500);
  });

  test("6. Borrado en cascada (Eliminar paciente elimina sus records)", async () => {
    const p = await new Patient(testPatient).save();
    const s = await new Staff({ nombre: "Pepe", numeroColegiado: "123", especialidad: "otra", categoriaProfesional: "médico/a adjunto/a", turno: "mañana", consultaAsignada: "1", experiencia: 1, contactoDepartamento: "1", estado: "activo" }).save();
    
    await new Record({ paciente: p._id, medicoResponsable: s._id, tipo: "consulta ambulatoria", motivo: "X", diagnostico: "X", estado: "cerrado" }).save();

    await request(app).delete(`/patients/${p._id}`).expect(200);

    const records = await Record.find({ paciente: p._id });
    expect(records.length).toBe(0);
  });

  test("7. Fallos de Query String en Patients (400 y 404)", async () => {
    await request(app).get("/patients").expect(400);
    await request(app).patch("/patients").expect(400);
    await request(app).delete("/patients").expect(400);

    await request(app).get("/patients?dni=00000000T").expect(404);
    await request(app).patch("/patients?dni=00000000T").send({ direccion: "A" }).expect(404);
    await request(app).delete("/patients?dni=00000000T").expect(404);

    const fakeId = "60c72b2f9b1d8b001c8e4b8a";
    await request(app).patch(`/patients/${fakeId}`).send({ direccion: "A" }).expect(404);
    await request(app).delete(`/patients/${fakeId}`).expect(404);
  });
});