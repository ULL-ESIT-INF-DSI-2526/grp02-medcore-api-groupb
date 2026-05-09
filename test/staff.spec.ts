import { describe, test, beforeEach, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Staff } from "../src/models/staff.js";
import { Record } from "../src/models/record.js";
import { Patient } from "../src/models/patients.js";

const testStaff = {
  nombre: "Dra. Martinez", numeroColegiado: "COL-5555", especialidad: "pediatría",
  categoriaProfesional: "médico/a adjunto/a", turno: "tarde", consultaAsignada: "202",
  experiencia: 10, contactoDepartamento: "ext 555", estado: "activo"
};

beforeEach(async () => {
  await Staff.deleteMany();
  await Record.deleteMany();
  await Patient.deleteMany();
});

describe("Pruebas sobre Personal Médico (/staff)", () => {
  test("1. CRUD básico (Crear, Leer, Modificar)", async () => {
    const postRes = await request(app).post("/staff").send(testStaff).expect(201);
    const id = postRes.body._id;

    await request(app).patch(`/staff/${id}`).send({ turno: "mañana" }).expect(200);
    
    const getRes = await request(app).get(`/staff?especialidad=pediatría`).expect(200);
    expect(getRes.body[0].turno).toBe("mañana");
  });

  test("2. Impedir borrado de médico con historiales (409 Conflict)", async () => {
    const s = await new Staff(testStaff).save();
    const p = await new Patient({ nombre: "X", fechaNacimiento: new Date(), dni: "11111111H", numSeguridadSocial: "111111111111", genero: "mujer", direccion: "x", telefono: "600111222", correo: "a@a.com", alergias: [], grupoSanguineo: "A+", estado: "activo" }).save();
    
    await new Record({ paciente: p._id, medicoResponsable: s._id, tipo: "consulta ambulatoria", motivo: "X", diagnostico: "X", estado: "cerrado" }).save();

    const delRes = await request(app).delete(`/staff?nombre=Dra. Martinez`).expect(409);
    expect(delRes.body.error).toContain("cambie su estado a 'inactivo'");
  });

  test("3. Borrado exitoso si no tiene historiales", async () => {
    const s = await new Staff(testStaff).save();
    await request(app).delete(`/staff/${s._id}`).expect(200);
    
    const busqueda = await Staff.findById(s._id);
    expect(busqueda).toBeNull();
  });

  test("4. Fallos de Query String y 404 en Staff", async () => {
    await request(app).get("/staff").expect(400);
    await request(app).patch("/staff").expect(400);
    await request(app).delete("/staff").expect(400);

    const fakeId = "60c72b2f9b1d8b001c8e4b8a";
    await request(app).get(`/staff/${fakeId}`).expect(404);
    await request(app).patch(`/staff/${fakeId}`).send({ turno: "tarde" }).expect(404);
    await request(app).delete(`/staff/${fakeId}`).expect(404);
    await request(app).delete("/staff?nombre=Nadie").expect(404);
    await request(app).patch("/staff?nombre=Nadie").send({ turno: "tarde" }).expect(404);
  });
});