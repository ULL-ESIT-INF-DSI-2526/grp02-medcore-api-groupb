import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Patient } from "../src/models/patients.js";
import { Record } from "../src/models/record.js";
import { Staff } from "../src/models/staff.js";

const buildPatientPayload = () => ({
	nombre: "Juan Perez",
	fechaNacimiento: "1990-01-01",
	dni: "12345678Z",
	numSeguridadSocial: `12345678${Math.floor(1000 + Math.random() * 9000)}`,
	genero: "hombre",
	direccion: "Calle Falsa 123",
	telefono: "612345678",
	correo: `juan.${Date.now()}@mail.com`,
	alergias: [],
	grupoSanguineo: "A+",
	estado: "activo",
});

const buildStaffPayload = () => ({
	nombre: "Maria Lopez",
	numeroColegiado: `COL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
	especialidad: "medicina general",
	categoriaProfesional: "médico/a adjunto/a",
	turno: "mañana",
	consultaAsignada: "A-101",
	experiencia: 8,
	contactoDepartamento: "dep.med@hospital.es",
	estado: "activo",
});

describe("Patients Router", () => {
	beforeEach(async () => {
		await Record.deleteMany({});
		await Patient.deleteMany({});
		await Staff.deleteMany({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("POST /patients crea un paciente", async () => {
		const payload = buildPatientPayload();
		const response = await request(app).post("/patients").send(payload).expect(201);
		expect(response.body.dni).toBe(payload.dni);
		const persisted = await Patient.findOne({ dni: payload.dni }).lean();
		expect(persisted).not.toBeNull();
		if (!persisted) {
			throw new Error("No se guardo el paciente");
		}
		expect(persisted.nombre).toBe(payload.nombre);
		expect(persisted.estado).toBe(payload.estado);
	});

	test("POST /patients devuelve 400 por validacion", async () => {
		const payload = buildPatientPayload();
		const response = await request(app).post("/patients").send({ ...payload, dni: "invalido" }).expect(400);
		expect(response.body.error).toContain("dni");
	});

	test("POST /patients devuelve 500 con error interno", async () => {
		vi.spyOn(Patient.prototype, "save").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).post("/patients").send(buildPatientPayload()).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /patients devuelve 400 sin filtros", async () => {
		const response = await request(app).get("/patients").expect(400);
		expect(response.text).toContain("Falta indicar");
	});

	test("GET /patients busca por nombre", async () => {
		const payload = buildPatientPayload();
		await new Patient(payload).save();
		const response = await request(app).get(`/patients?nombre=${payload.nombre}`).expect(200);
		expect(response.body).toHaveLength(1);
	});

	test("GET /patients busca por dni", async () => {
		const payload = buildPatientPayload();
		await new Patient(payload).save();
		const response = await request(app).get(`/patients?dni=${payload.dni}`).expect(200);
		expect(response.body).toHaveLength(1);
	});

	test("GET /patients devuelve 404 si no encuentra", async () => {
		await request(app).get("/patients?dni=00000000T").expect(404);
	});

	test("GET /patients devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Patient, "find").mockRejectedValueOnce(validationError);
		const response = await request(app).get("/patients?nombre=Juan Perez").expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("GET /patients devuelve 500 con error interno", async () => {
		vi.spyOn(Patient, "find").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).get("/patients?nombre=Juan Perez").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /patients/:id devuelve paciente", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const response = await request(app).get(`/patients/${patient._id.toString()}`).expect(200);
		expect(response.body._id).toBe(patient._id.toString());
	});

	test("GET /patients/:id devuelve 404 si no existe", async () => {
		await request(app).get("/patients/507f1f77bcf86cd799439011").expect(404);
	});

	test("GET /patients/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Patient, "findById").mockRejectedValueOnce(validationError);
		const response = await request(app).get("/patients/id-malformado").expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("GET /patients/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Patient, "findById").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).get("/patients/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("PATCH /patients devuelve 400 sin filtros", async () => {
		const response = await request(app).patch("/patients").send({ direccion: "nueva" }).expect(400);
		expect(response.text).toContain("Falta indicar");
	});

	test("PATCH /patients actualiza por nombre", async () => {
		const payload = buildPatientPayload();
		await new Patient(payload).save();
		const response = await request(app)
			.patch(`/patients?nombre=${payload.nombre}`)
			.send({ direccion: "Nueva direccion" })
			.expect(200);
		expect(response.body.direccion).toBe("Nueva direccion");
		const updated = await Patient.findOne({ dni: payload.dni }).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el paciente");
		}
		expect(updated.direccion).toBe("Nueva direccion");
	});

	test("PATCH /patients actualiza por dni", async () => {
		const payload = buildPatientPayload();
		await new Patient(payload).save();
		const response = await request(app)
			.patch(`/patients?dni=${payload.dni}`)
			.send({ direccion: "Otra direccion" })
			.expect(200);
		expect(response.body.direccion).toBe("Otra direccion");
		const updated = await Patient.findOne({ dni: payload.dni }).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el paciente");
		}
		expect(updated.direccion).toBe("Otra direccion");
	});

	test("PATCH /patients devuelve 404 si no encuentra", async () => {
		await request(app).patch("/patients?dni=00000000T").send({ direccion: "x" }).expect(404);
	});

	test("PATCH /patients devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Patient, "findOneAndUpdate").mockRejectedValueOnce(validationError);
		const response = await request(app).patch("/patients?dni=12345678Z").send({ direccion: "x" }).expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("PATCH /patients devuelve 500 con error interno", async () => {
		vi.spyOn(Patient, "findOneAndUpdate").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).patch("/patients?dni=12345678Z").send({ direccion: "x" }).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("PATCH /patients/:id actualiza por id", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const response = await request(app)
			.patch(`/patients/${patient._id.toString()}`)
			.send({ direccion: "Direccion por id" })
			.expect(200);
		expect(response.body.direccion).toBe("Direccion por id");
		const updated = await Patient.findById(patient._id).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el paciente");
		}
		expect(updated.direccion).toBe("Direccion por id");
	});

	test("PATCH /patients/:id devuelve 404 si no existe", async () => {
		await request(app).patch("/patients/507f1f77bcf86cd799439011").send({ direccion: "x" }).expect(404);
	});

	test("PATCH /patients/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Patient, "findByIdAndUpdate").mockRejectedValueOnce(validationError);
		const response = await request(app).patch("/patients/id-malformado").send({ direccion: "x" }).expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("PATCH /patients/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Patient, "findByIdAndUpdate").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).patch("/patients/507f1f77bcf86cd799439011").send({ direccion: "x" }).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("DELETE /patients devuelve 400 sin filtros", async () => {
		const response = await request(app).delete("/patients").expect(400);
		expect(response.text).toContain("Falta indicar");
	});

	test("DELETE /patients devuelve 404 si no encuentra", async () => {
		await request(app).delete("/patients?dni=00000000T").expect(404);
	});

	test("DELETE /patients borra por dni y elimina records asociados", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "dolor",
			diagnostico: "leve",
			estado: "abierto",
		}).save();

		const response = await request(app).delete(`/patients?dni=${patient.dni}`).expect(200);
		expect(response.body._id).toBe(patient._id.toString());

		const linkedRecords = await Record.find({ paciente: patient._id });
		expect(linkedRecords).toHaveLength(0);
		const deletedPatient = await Patient.findById(patient._id).lean();
		expect(deletedPatient).toBeNull();
	});

	test("DELETE /patients borra por nombre", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const response = await request(app).delete(`/patients?nombre=${patient.nombre}`).expect(200);
		expect(response.body._id).toBe(patient._id.toString());
		const deletedPatient = await Patient.findById(patient._id).lean();
		expect(deletedPatient).toBeNull();
	});

	test("DELETE /patients devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Patient, "findOne").mockRejectedValueOnce(validationError);
		const response = await request(app).delete("/patients?dni=12345678Z").expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("DELETE /patients devuelve 500 con error interno", async () => {
		vi.spyOn(Patient, "findOne").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).delete("/patients?dni=12345678Z").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("DELETE /patients/:id devuelve 404 si no existe", async () => {
		await request(app).delete("/patients/507f1f77bcf86cd799439011").expect(404);
	});

	test("DELETE /patients/:id borra paciente y records asociados", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "dolor",
			diagnostico: "leve",
			estado: "abierto",
		}).save();

		const response = await request(app).delete(`/patients/${patient._id.toString()}`).expect(200);
		expect(response.body._id).toBe(patient._id.toString());

		const linkedRecords = await Record.find({ paciente: patient._id });
		expect(linkedRecords).toHaveLength(0);
		const deletedPatient = await Patient.findById(patient._id).lean();
		expect(deletedPatient).toBeNull();
	});

	test("DELETE /patients/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Patient, "findById").mockRejectedValueOnce(validationError);
		const response = await request(app).delete("/patients/id-malformado").expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("DELETE /patients/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Patient, "findById").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).delete("/patients/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});
});
