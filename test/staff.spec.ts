import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Staff } from "../src/models/staff.js";
import { Record } from "../src/models/record.js";
import { Patient } from "../src/models/patients.js";

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

describe("Staff Router", () => {
	beforeEach(async () => {
		await Record.deleteMany({});
		await Staff.deleteMany({});
		await Patient.deleteMany({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("POST /staff crea personal", async () => {
		const payload = buildStaffPayload();
		const response = await request(app).post("/staff").send(payload).expect(201);
		expect(response.body.numeroColegiado).toBe(payload.numeroColegiado);
		const persisted = await Staff.findOne({ numeroColegiado: payload.numeroColegiado }).lean();
		expect(persisted).not.toBeNull();
		if (!persisted) {
			throw new Error("No se guardo el personal");
		}
		expect(persisted.nombre).toBe(payload.nombre);
		expect(persisted.estado).toBe(payload.estado);
	});

	test("POST /staff devuelve 400 por validacion", async () => {
		const payload = buildStaffPayload();
		const response = await request(app).post("/staff").send({ ...payload, nombre: "ab" }).expect(400);
		expect(response.body.error).toContain("al menos 3 caracteres");
	});

	test("POST /staff devuelve 500 con error interno", async () => {
		vi.spyOn(Staff.prototype, "save").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).post("/staff").send(buildStaffPayload()).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /staff devuelve 400 sin filtros", async () => {
		const response = await request(app).get("/staff").expect(400);
		expect(response.text).toContain("Falta indicar");
	});

	test("GET /staff busca por nombre", async () => {
		const payload = buildStaffPayload();
		await new Staff(payload).save();
		const response = await request(app).get(`/staff?nombre=${payload.nombre}`).expect(200);
		expect(response.body).toHaveLength(1);
	});

	test("GET /staff busca por especialidad", async () => {
		const payload = buildStaffPayload();
		await new Staff(payload).save();
		const response = await request(app).get(`/staff?especialidad=${payload.especialidad}`).expect(200);
		expect(response.body).toHaveLength(1);
	});

	test("GET /staff devuelve 404 si no encuentra", async () => {
		await request(app).get("/staff?nombre=Inexistente").expect(404);
	});

	test("GET /staff devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Staff, "find").mockRejectedValueOnce(validationError);
		const response = await request(app).get("/staff?nombre=Maria Lopez").expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("GET /staff devuelve 500 con error interno", async () => {
		vi.spyOn(Staff, "find").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).get("/staff?nombre=Maria Lopez").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /staff/:id devuelve personal", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const response = await request(app).get(`/staff/${staff._id.toString()}`).expect(200);
		expect(response.body._id).toBe(staff._id.toString());
	});

	test("GET /staff/:id devuelve 404 si no existe", async () => {
		await request(app).get("/staff/507f1f77bcf86cd799439011").expect(404);
	});

	test("GET /staff/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Staff, "findById").mockRejectedValueOnce(validationError);
		const response = await request(app).get("/staff/id-malformado").expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("GET /staff/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Staff, "findById").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).get("/staff/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("PATCH /staff devuelve 400 sin filtros", async () => {
		const response = await request(app).patch("/staff").send({ turno: "tarde" }).expect(400);
		expect(response.text).toContain("Falta indicar");
	});

	test("PATCH /staff actualiza por nombre", async () => {
		const payload = buildStaffPayload();
		await new Staff(payload).save();
		const response = await request(app)
			.patch(`/staff?nombre=${payload.nombre}`)
			.send({ turno: "tarde" })
			.expect(200);
		expect(response.body.turno).toBe("tarde");
		const updated = await Staff.findOne({ numeroColegiado: payload.numeroColegiado }).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el personal");
		}
		expect(updated.turno).toBe("tarde");
	});

	test("PATCH /staff actualiza por especialidad", async () => {
		const payload = buildStaffPayload();
		await new Staff(payload).save();
		const response = await request(app)
			.patch(`/staff?especialidad=${payload.especialidad}`)
			.send({ turno: "noche" })
			.expect(200);
		expect(response.body.turno).toBe("noche");
		const updated = await Staff.findOne({ numeroColegiado: payload.numeroColegiado }).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el personal");
		}
		expect(updated.turno).toBe("noche");
	});

	test("PATCH /staff devuelve 404 si no encuentra", async () => {
		await request(app).patch("/staff?nombre=Inexistente").send({ turno: "tarde" }).expect(404);
	});

	test("PATCH /staff devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Staff, "findOneAndUpdate").mockRejectedValueOnce(validationError);
		const response = await request(app).patch("/staff?nombre=Maria Lopez").send({ turno: "tarde" }).expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("PATCH /staff devuelve 500 con error interno", async () => {
		vi.spyOn(Staff, "findOneAndUpdate").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).patch("/staff?nombre=Maria Lopez").send({ turno: "tarde" }).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("PATCH /staff/:id actualiza por id", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const response = await request(app).patch(`/staff/${staff._id.toString()}`).send({ turno: "rotatorio" }).expect(200);
		expect(response.body.turno).toBe("rotatorio");
		const updated = await Staff.findById(staff._id).lean();
		expect(updated).not.toBeNull();
		if (!updated) {
			throw new Error("No se actualizo el personal");
		}
		expect(updated.turno).toBe("rotatorio");
	});

	test("PATCH /staff/:id devuelve 404 si no existe", async () => {
		await request(app).patch("/staff/507f1f77bcf86cd799439011").send({ turno: "tarde" }).expect(404);
	});

	test("PATCH /staff/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Staff, "findByIdAndUpdate").mockRejectedValueOnce(validationError);
		const response = await request(app).patch("/staff/id-malformado").send({ turno: "tarde" }).expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("PATCH /staff/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Staff, "findByIdAndUpdate").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).patch("/staff/507f1f77bcf86cd799439011").send({ turno: "tarde" }).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("DELETE /staff devuelve 400 sin filtros", async () => {
		const response = await request(app).delete("/staff").expect(400);
		expect(response.text).toContain("Falta indicar");
	});

	test("DELETE /staff devuelve 404 si no encuentra", async () => {
		await request(app).delete("/staff?nombre=Inexistente").expect(404);
	});

	test("DELETE /staff devuelve 409 si tiene historiales", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const patient = await new Patient(buildPatientPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "dolor",
			diagnostico: "leve",
			estado: "abierto",
		}).save();

		const response = await request(app).delete(`/staff?nombre=${staff.nombre}`).expect(409);
		expect(response.body.error).toContain("historiales asignados");
	});

	test("DELETE /staff borra por nombre", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const response = await request(app).delete(`/staff?nombre=${staff.nombre}`).expect(200);
		expect(response.body._id).toBe(staff._id.toString());
		const deletedStaff = await Staff.findById(staff._id).lean();
		expect(deletedStaff).toBeNull();
	});

	test("DELETE /staff borra por especialidad", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const response = await request(app).delete(`/staff?especialidad=${staff.especialidad}`).expect(200);
		expect(response.body._id).toBe(staff._id.toString());
		const deletedStaff = await Staff.findById(staff._id).lean();
		expect(deletedStaff).toBeNull();
	});

	test("DELETE /staff devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Staff, "findOne").mockRejectedValueOnce(validationError);
		const response = await request(app).delete("/staff?nombre=Maria Lopez").expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("DELETE /staff devuelve 500 con error interno", async () => {
		vi.spyOn(Staff, "findOne").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).delete("/staff?nombre=Maria Lopez").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("DELETE /staff/:id devuelve 404 si no existe", async () => {
		await request(app).delete("/staff/507f1f77bcf86cd799439011").expect(404);
	});

	test("DELETE /staff/:id devuelve 409 si tiene historiales", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const patient = await new Patient(buildPatientPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "dolor",
			diagnostico: "leve",
			estado: "abierto",
		}).save();

		const response = await request(app).delete(`/staff/${staff._id.toString()}`).expect(409);
		expect(response.body.error).toContain("historiales asignados");
	});

	test("DELETE /staff/:id borra por id", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const response = await request(app).delete(`/staff/${staff._id.toString()}`).expect(200);
		expect(response.body._id).toBe(staff._id.toString());
		const deletedStaff = await Staff.findById(staff._id).lean();
		expect(deletedStaff).toBeNull();
	});

	test("DELETE /staff/:id devuelve 400 con ValidationError", async () => {
		const validationError = new Error("id invalido") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Staff, "findById").mockRejectedValueOnce(validationError);
		const response = await request(app).delete("/staff/id-malformado").expect(400);
		expect(response.body.error).toContain("id invalido");
	});

	test("DELETE /staff/:id devuelve 500 con error interno", async () => {
		vi.spyOn(Staff, "findById").mockRejectedValueOnce(new Error("fallo interno"));
		const response = await request(app).delete("/staff/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});
});
