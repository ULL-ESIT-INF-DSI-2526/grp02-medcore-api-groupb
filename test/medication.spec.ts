import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Medication } from "../src/models/medication.js";
import { Record } from "../src/models/record.js";
import { Patient } from "../src/models/patients.js";
import { Staff } from "../src/models/staff.js";

const buildMedicationPayload = () => ({
	nombre: "Paracetamol",
	principioActivo: "Paracetamol",
	codigoNacional: `CN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	formaFarmaceutica: "comprimido",
	dosisEstandar: 500,
	unidadMedida: "mg",
	viaAdministracion: "oral",
	stock: 20,
	precio: 2.5,
	prescripcion: false,
	caducidadStock: "2030-12-31",
	contraindicaciones: ["Embarazo"],
});

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

describe("Medication Router", () => {
	beforeEach(async () => {
		await Record.deleteMany({});
		await Medication.deleteMany({});
		await Patient.deleteMany({});
		await Staff.deleteMany({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("POST /medications crea un medicamento", async () => {
		const payload = buildMedicationPayload();
		const response = await request(app).post("/medications").send(payload).expect(201);
		expect(response.body.nombre).toBe(payload.nombre);
		const persisted = await Medication.findOne({ codigoNacional: payload.codigoNacional }).lean();
		expect(persisted).not.toBeNull();
		if (!persisted) {
			throw new Error("No se guardo el medicamento");
		}
		expect(persisted.nombre).toBe(payload.nombre);
		expect(persisted.stock).toBe(payload.stock);
		expect(persisted.prescripcion).toBe(payload.prescripcion);
	});

	test("POST /medications devuelve 400 por validacion", async () => {
		const payload = buildMedicationPayload();
		const response = await request(app).post("/medications").send({ ...payload, nombre: "a" }).expect(400);
		expect(response.body.error).toContain("nombre comercial");
	});

	test("POST /medications devuelve 500 cuando falla el guardado", async () => {
		vi.spyOn(Medication.prototype, "save").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).post("/medications").send(buildMedicationPayload()).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /medications devuelve 400 sin filtros", async () => {
		const response = await request(app).get("/medications").expect(400);
		expect(response.body.error).toContain("Falta parámetro de búsqueda");
	});

	test("GET /medications busca por nombre", async () => {
		const payload = buildMedicationPayload();
		await new Medication(payload).save();
		const response = await request(app).get(`/medications?nombre=${payload.nombre}`).expect(200);
		expect(response.body).toHaveLength(1);
	});

	test("GET /medications busca por principioActivo", async () => {
		const payload = buildMedicationPayload();
		await new Medication(payload).save();
		const response = await request(app).get(`/medications?principioActivo=${payload.principioActivo}`).expect(200);
		expect(response.body).toHaveLength(1);
	});

	test("GET /medications busca por codigoNacional", async () => {
		const payload = buildMedicationPayload();
		await new Medication(payload).save();
		const response = await request(app).get(`/medications?codigoNacional=${payload.codigoNacional}`).expect(200);
		expect(response.body).toHaveLength(1);
	});

	test("GET /medications devuelve 404 cuando no encuentra", async () => {
		await request(app).get("/medications?nombre=Inexistente").expect(404);
	});

	test("GET /medications devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Medication, "find").mockRejectedValueOnce(validationError);
		const response = await request(app).get("/medications?nombre=Paracetamol").expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("GET /medications devuelve 500 con error interno", async () => {
		vi.spyOn(Medication, "find").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).get("/medications?nombre=Paracetamol").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /medications/:id devuelve el medicamento", async () => {
		const med = await new Medication(buildMedicationPayload()).save();
		const response = await request(app).get(`/medications/${med._id.toString()}`).expect(200);
		expect(response.body._id).toBe(med._id.toString());
	});

	test("GET /medications/:id devuelve 404 si no existe", async () => {
		const fakeId = "507f1f77bcf86cd799439011";
		await request(app).get(`/medications/${fakeId}`).expect(404);
	});

	test("GET /medications/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Medication, "findById").mockRejectedValueOnce(validationError);
		const response = await request(app).get("/medications/invalid-id").expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("GET /medications/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Medication, "findById").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).get("/medications/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("PATCH /medications devuelve 400 sin filtros", async () => {
		const response = await request(app).patch("/medications").send({ stock: 5 }).expect(400);
		expect(response.body.error).toContain("Falta parámetro de búsqueda");
	});

	test("PATCH /medications actualiza por query", async () => {
		const payload = buildMedicationPayload();
		await new Medication(payload).save();
		const response = await request(app)
			.patch(`/medications?codigoNacional=${payload.codigoNacional}`)
			.send({ stock: 99 })
			.expect(200);
		expect(response.body.stock).toBe(99);
		const updated = await Medication.findOne({ codigoNacional: payload.codigoNacional }).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el medicamento");
		}
		expect(updated.stock).toBe(99);
	});

	test("PATCH /medications devuelve 404 si no encuentra", async () => {
		await request(app).patch("/medications?codigoNacional=NOEXISTE").send({ stock: 10 }).expect(404);
	});

	test("PATCH /medications devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Medication, "findOneAndUpdate").mockRejectedValueOnce(validationError);
		const response = await request(app).patch("/medications?nombre=Paracetamol").send({ stock: 10 }).expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("PATCH /medications devuelve 500 con error interno", async () => {
		vi.spyOn(Medication, "findOneAndUpdate").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).patch("/medications?nombre=Paracetamol").send({ stock: 10 }).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("PATCH /medications/:id actualiza por id", async () => {
		const med = await new Medication(buildMedicationPayload()).save();
		const response = await request(app).patch(`/medications/${med._id.toString()}`).send({ stock: 42 }).expect(200);
		expect(response.body.stock).toBe(42);
		const updated = await Medication.findById(med._id).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el medicamento");
		}
		expect(updated.stock).toBe(42);
	});

	test("PATCH /medications/:id devuelve 404 si no existe", async () => {
		const fakeId = "507f1f77bcf86cd799439011";
		await request(app).patch(`/medications/${fakeId}`).send({ stock: 42 }).expect(404);
	});

	test("PATCH /medications/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Medication, "findByIdAndUpdate").mockRejectedValueOnce(validationError);
		const response = await request(app).patch("/medications/invalid-id").send({ stock: 10 }).expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("PATCH /medications/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Medication, "findByIdAndUpdate").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).patch("/medications/507f1f77bcf86cd799439011").send({ stock: 10 }).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("DELETE /medications devuelve 400 sin filtros", async () => {
		const response = await request(app).delete("/medications").expect(400);
		expect(response.body.error).toContain("Falta parámetro de búsqueda");
	});

	test("DELETE /medications devuelve 404 si no existe", async () => {
		await request(app).delete("/medications?nombre=Inexistente").expect(404);
	});

	test("DELETE /medications devuelve 409 si esta prescrito", async () => {
		const med = await new Medication(buildMedicationPayload()).save();
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "dolor",
			diagnostico: "leve",
			medicamentosPrescritos: [{
				medicamento: med._id,
				cantidad: 1,
				instruccionesAdministracion: "1 cada 8h",
			}],
			costeTotalMedicamentos: 2.5,
			estado: "abierto",
		}).save();

		const response = await request(app).delete(`/medications?codigoNacional=${med.codigoNacional}`).expect(409);
		expect(response.body.error).toContain("No se puede borrar");
	});

	test("DELETE /medications borra por query", async () => {
		const med = await new Medication(buildMedicationPayload()).save();
		const response = await request(app).delete(`/medications?codigoNacional=${med.codigoNacional}`).expect(200);
		expect(response.body._id).toBe(med._id.toString());
		const found = await Medication.findById(med._id).lean();
		expect(found).toBeNull();
	});

	test("DELETE /medications devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Medication, "findOne").mockRejectedValueOnce(validationError);
		const response = await request(app).delete("/medications?nombre=Paracetamol").expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("DELETE /medications devuelve 500 con error interno", async () => {
		vi.spyOn(Medication, "findOne").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).delete("/medications?nombre=Paracetamol").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("DELETE /medications/:id devuelve 404 si no existe", async () => {
		const fakeId = "507f1f77bcf86cd799439011";
		await request(app).delete(`/medications/${fakeId}`).expect(404);
	});

	test("DELETE /medications/:id devuelve 409 si esta prescrito", async () => {
		const med = await new Medication(buildMedicationPayload()).save();
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "dolor",
			diagnostico: "leve",
			medicamentosPrescritos: [{
				medicamento: med._id,
				cantidad: 1,
				instruccionesAdministracion: "1 cada 8h",
			}],
			costeTotalMedicamentos: 2.5,
			estado: "abierto",
		}).save();

		const response = await request(app).delete(`/medications/${med._id.toString()}`).expect(409);
		expect(response.body.error).toContain("No se puede borrar");
	});

	test("DELETE /medications/:id borra por id", async () => {
		const med = await new Medication(buildMedicationPayload()).save();
		const response = await request(app).delete(`/medications/${med._id.toString()}`).expect(200);
		expect(response.body._id).toBe(med._id.toString());
		const found = await Medication.findById(med._id).lean();
		expect(found).toBeNull();
	});

	test("DELETE /medications/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Medication, "findById").mockRejectedValueOnce(validationError);
		const response = await request(app).delete("/medications/invalid-id").expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("DELETE /medications/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Medication, "findById").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).delete("/medications/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});
});
