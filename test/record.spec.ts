import { describe, test, beforeEach, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Record } from "../src/models/record.js";
import { Patient } from "../src/models/patients.js";
import { Staff } from "../src/models/staff.js";
import { Medication } from "../src/models/medication.js";

const testPatient = {
  nombre: "Juan Perez",
  fechaNacimiento: new Date("1990-01-01"),
  dni: "11111111H",
  numSeguridadSocial: "123456789012",
  genero: "hombre",
  direccion: "Calle Falsa 123",
  telefono: "600123456",
  correo: "juan@example.com",
  alergias: [],
  grupoSanguineo: "0+",
  estado: "activo"
};

const testDoctor = {
  nombre: "Doctor House",
  numeroColegiado: "COL-1234",
  especialidad: "medicina general",
  categoriaProfesional: "médico/a adjunto/a",
  turno: "mañana",
  consultaAsignada: "101",
  experiencia: 15,
  contactoDepartamento: "ext 123",
  estado: "activo"
};

const testMedication = {
  nombre: "Ibuprofeno",
  principioActivo: "Ibuprofeno",
  codigoNacional: "123456",
  formaFarmaceutica: "comprimido",
  dosisEstandar: 600,
  unidadMedida: "mg",
  viaAdministracion: "oral",
  stock: 50,
  precio: 5,
  prescripcion: true,
  caducidadStock: new Date("2030-01-01"),
  contraindicaciones: []
};

beforeEach(async () => {
  await Record.deleteMany();
  await Patient.deleteMany();
  await Staff.deleteMany();
  await Medication.deleteMany();

  await new Patient(testPatient).save();
  await new Staff(testDoctor).save();
  await new Medication(testMedication).save();
});

describe("Pruebas sobre Consultas e Ingresos (/records)", () => {

  test("1. Creación de un registro con datos válidos y stock suficiente", async () => {
    const response = await request(app)
      .post("/records")
      .send({
        dniPaciente: "11111111H",
        numeroColegiadoMedico: "COL-1234",
        tipo: "consulta ambulatoria",
        motivo: "Dolor de cabeza",
        diagnostico: "Migraña",
        estado: "cerrado",
        medicamentos: [
          {
            codigoNacional: "123456",
            cantidad: 2,
            instruccionesAdministracion: "Tomar cada 8 horas"
          }
        ]
      })
      .expect(201);

    expect(response.body.costeTotalMedicamentos).toBe(10);

    const medActualizado = await Medication.findOne({ codigoNacional: "123456" });
    expect(medActualizado?.stock).toBe(48);
  });

  test("2. Fallo de creación por stock insuficiente", async () => {
    const response = await request(app)
      .post("/records")
      .send({
        dniPaciente: "11111111H",
        numeroColegiadoMedico: "COL-1234",
        tipo: "consulta ambulatoria",
        motivo: "Dolor de cabeza",
        diagnostico: "Migraña",
        estado: "cerrado",
        medicamentos: [
          {
            codigoNacional: "123456",
            cantidad: 100,
            instruccionesAdministracion: "Tomar muchas"
          }
        ]
      })
      .expect(400);

    expect(response.body.error).toContain("Stock insuficiente");
  });

  test("3. Creación con datos inválidos (falta el motivo y tipo erróneo)", async () => {
    await request(app)
      .post("/records")
      .send({
        dniPaciente: "11111111H",
        numeroColegiadoMedico: "COL-1234",
        tipo: "tipo inventado",
        diagnostico: "Migraña",
        estado: "cerrado",
        medicamentos: []
      })
      .expect(400);
  });

  test("4. Lectura por query string (DNI)", async () => {
    const patientId = (await Patient.findOne({ dni: "11111111H" }))!._id;
    const doctorId = (await Staff.findOne({ numeroColegiado: "COL-1234" }))!._id;
    
    await new Record({
      paciente: patientId, medicoResponsable: doctorId, tipo: "consulta ambulatoria",
      motivo: "Revisión", diagnostico: "Sano", estado: "cerrado"
    }).save();

    const response = await request(app).get("/records/paciente?dni=11111111H").expect(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].motivo).toBe("Revisión");
  });

  test("5. Lectura por identificador dinámico", async () => {
    const patientId = (await Patient.findOne({ dni: "11111111H" }))!._id;
    const doctorId = (await Staff.findOne({ numeroColegiado: "COL-1234" }))!._id;
    
    const record = await new Record({
      paciente: patientId, medicoResponsable: doctorId, tipo: "consulta ambulatoria",
      motivo: "Prueba ID", diagnostico: "Sano", estado: "cerrado"
    }).save();

    const response = await request(app).get(`/records/${record._id}`).expect(200);
    expect(response.body.motivo).toBe("Prueba ID");
  });

  test("6. Borrado y efectos sobre entidades (Restauración de stock)", async () => {
    const postResponse = await request(app)
      .post("/records")
      .send({
        dniPaciente: "11111111H", numeroColegiadoMedico: "COL-1234", tipo: "consulta ambulatoria",
        motivo: "Test Borrado", diagnostico: "Sano", estado: "cerrado",
        medicamentos: [{ codigoNacional: "123456", cantidad: 10, instruccionesAdministracion: "Tomar" }]
      });
    
    const recordId = postResponse.body._id;

    await request(app).delete(`/records/${recordId}`).expect(200);

    const medRestaurado = await Medication.findOne({ codigoNacional: "123456" });
    expect(medRestaurado?.stock).toBe(50);
  });

  test("7. Fallos de Lectura, Modificación y Borrado en Records (400 y 404)", async () => {
    await request(app).get("/records/paciente").expect(400);
    await request(app).get("/records/fechas").expect(400);
    
    await request(app).get("/records/fechas?fechaInicio=2020-01-01&fechaFin=2030-01-01").expect(200);
    await request(app).get("/records/fechas?fechaInicio=2020-01-01&fechaFin=2030-01-01&tipo=consulta ambulatoria").expect(200);

    const fakeId = "60c72b2f9b1d8b001c8e4b8a";
    await request(app).patch(`/records/${fakeId}`).send({ motivo: "X" }).expect(404);
    await request(app).delete(`/records/${fakeId}`).expect(404);
  });

  test("8. Modificar (PATCH) actualizando lista de medicamentos (Restaurar y Descontar)", async () => {
    const postRes = await request(app).post("/records").send({
        dniPaciente: "11111111H", numeroColegiadoMedico: "COL-1234", tipo: "consulta ambulatoria",
        motivo: "Test", diagnostico: "Sano", estado: "cerrado",
        medicamentos: [{ codigoNacional: "123456", cantidad: 2, instruccionesAdministracion: "Tomar" }]
    });

    const recordId = postRes.body._id;

    await request(app).patch(`/records/${recordId}`).send({
      dniPaciente: "11111111H",
      numeroColegiadoMedico: "COL-1234",
      medicamentos: [{ codigoNacional: "123456", cantidad: 5, instruccionesAdministracion: "Tomar" }]
    }).expect(200);
  });
});