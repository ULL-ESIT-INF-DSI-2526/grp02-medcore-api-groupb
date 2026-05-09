import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { Record } from "../src/models/record.js";
import { Patient } from "../src/models/patients.js";
import { Staff } from "../src/models/staff.js";
import { Medication } from "../src/models/medication.js";

const dniPool = ["12345678Z", "87654321X", "11111111H", "22222222J", "33333333P", "44444444A"];
let patientCounter = 0;

const buildPatientPayload = () => ({
	nombre: "Juan Perez",
	fechaNacimiento: "1990-01-01",
	dni: dniPool[patientCounter % dniPool.length],
	numSeguridadSocial: `${123456780000 + patientCounter++}`,
	genero: "hombre",
	direccion: "Calle Falsa 123",
	telefono: "612345678",
	correo: `juan.${Date.now()}.${patientCounter}@mail.com`,
	alergias: [],
	grupoSanguineo: "A+",
	estado: "activo",
});

const buildStaffPayload = (estado: "activo" | "inactivo" = "activo") => ({
	nombre: "Maria Lopez",
	numeroColegiado: `COL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
	especialidad: "medicina general",
	categoriaProfesional: "médico/a adjunto/a",
	turno: "mañana",
	consultaAsignada: "A-101",
	experiencia: 8,
	contactoDepartamento: "dep.med@hospital.es",
	estado,
});

const buildMedicationPayload = (overrides?: Partial<{ codigoNacional: string; stock: number; precio: number; caducidadStock: string }>) => ({
	nombre: "Paracetamol",
	principioActivo: "Paracetamol",
	codigoNacional: overrides?.codigoNacional ?? `CN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	formaFarmaceutica: "comprimido",
	dosisEstandar: 500,
	unidadMedida: "mg",
	viaAdministracion: "oral",
	stock: overrides?.stock ?? 20,
	precio: overrides?.precio ?? 2.5,
	prescripcion: true,
	caducidadStock: overrides?.caducidadStock ?? "2030-12-31",
	contraindicaciones: [],
});

const buildRecordBody = (patient: { dni: string }, staff: { numeroColegiado: string }, medicationCode: string, cantidad = 2) => ({
	dniPaciente: patient.dni,
	numeroColegiadoMedico: staff.numeroColegiado,
	tipo: "consulta ambulatoria",
	fechaInicio: "2025-01-01",
	fechaFin: "2025-01-02",
	motivo: "dolor",
	diagnostico: "leve",
	estado: "abierto",
	medicamentos: [
		{
			codigoNacional: medicationCode,
			cantidad,
			instruccionesAdministracion: "1 cada 8h",
		},
	],
});

describe("Records Router", () => {
	beforeEach(async () => {
		await Record.deleteMany({});
		await Medication.deleteMany({});
		await Patient.deleteMany({});
		await Staff.deleteMany({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("POST /records crea registro y descuenta stock", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();
		const med = await new Medication(buildMedicationPayload()).save();

		const body = buildRecordBody(patient, staff, med.codigoNacional, 3);
		const response = await request(app).post("/records").send(body).expect(201);

		expect(response.body.costeTotalMedicamentos).toBe(7.5);
		const updatedMed = await Medication.findById(med._id);
		expect(updatedMed?.stock).toBe(17);
	});

	test("POST /records devuelve 400 si paciente no existe", async () => {
		const staff = await new Staff(buildStaffPayload()).save();
		const med = await new Medication(buildMedicationPayload()).save();

		const response = await request(app)
			.post("/records")
			.send(buildRecordBody({ dni: "99999999R" }, staff, med.codigoNacional))
			.expect(400);

		expect(response.body.error).toContain("no existe");
	});

	test("POST /records devuelve 400 si medico no existe o inactivo", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const med = await new Medication(buildMedicationPayload()).save();

		const responseNoExiste = await request(app)
			.post("/records")
			.send(buildRecordBody(patient, { numeroColegiado: "NOEXISTE" }, med.codigoNacional))
			.expect(400);
		expect(responseNoExiste.body.error).toContain("no existe o se encuentra inactivo");

		const inactiveStaff = await new Staff(buildStaffPayload("inactivo")).save();
		const responseInactivo = await request(app)
			.post("/records")
			.send(buildRecordBody(patient, inactiveStaff, med.codigoNacional))
			.expect(400);
		expect(responseInactivo.body.error).toContain("inactivo");
	});

	test("POST /records devuelve 400 si medicamento no existe", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();

		const response = await request(app)
			.post("/records")
			.send(buildRecordBody(patient, staff, "CN-NO-EXISTE"))
			.expect(400);

		expect(response.body.error).toContain("no existe");
	});

	test("POST /records devuelve 400 por stock insuficiente", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();
		const med = await new Medication(buildMedicationPayload({ stock: 1 })).save();

		const response = await request(app)
			.post("/records")
			.send(buildRecordBody(patient, staff, med.codigoNacional, 5))
			.expect(400);

		expect(response.body.error).toContain("Stock insuficiente");
	});

	test("POST /records devuelve 400 por medicamento caducado", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();
		const med = await new Medication(buildMedicationPayload({ caducidadStock: "2000-01-01" })).save();

		const response = await request(app)
			.post("/records")
			.send(buildRecordBody(patient, staff, med.codigoNacional, 1))
			.expect(400);

		expect(response.body.error).toContain("caducado");
	});

	test("POST /records devuelve 400 con ValidationError", async () => {
		const validationError = new Error("error validacion") as Error & { name: string };
		validationError.name = "ValidationError";
		vi.spyOn(Record.prototype, "save").mockRejectedValueOnce(validationError);

		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();
		const med = await new Medication(buildMedicationPayload()).save();

		const response = await request(app).post("/records").send(buildRecordBody(patient, staff, med.codigoNacional)).expect(400);
		expect(response.body.error).toContain("error validacion");
	});

	test("POST /records devuelve 500 con error interno", async () => {
		const castError = new Error("fallo interno") as Error & { name: string };
		castError.name = "CastError";
		vi.spyOn(Record.prototype, "save").mockRejectedValueOnce(castError);

		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();
		const med = await new Medication(buildMedicationPayload()).save();

		const response = await request(app).post("/records").send(buildRecordBody(patient, staff, med.codigoNacional)).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /records/paciente devuelve 400 sin dni", async () => {
		const response = await request(app).get("/records/paciente").expect(400);
		expect(response.body.error).toContain("DNI");
	});

	test("GET /records/paciente devuelve 404 si paciente no existe", async () => {
		const response = await request(app).get("/records/paciente?dni=00000000T").expect(404);
		expect(response.body.error).toContain("Paciente no encontrado");
	});

	test("GET /records/paciente devuelve registros ordenados", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-02-01",
			motivo: "B",
			diagnostico: "B",
			estado: "abierto",
		}).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "A",
			diagnostico: "A",
			estado: "abierto",
		}).save();

		const response = await request(app).get(`/records/paciente?dni=${patient.dni}`).expect(200);
		expect(response.body).toHaveLength(2);
		expect(response.body[0].motivo).toBe("A");
	});

	test("GET /records/paciente devuelve 400 en catch con Error", async () => {
		vi.spyOn(Patient, "findOne").mockRejectedValueOnce(new Error("fallo"));
		const response = await request(app).get("/records/paciente?dni=12345678Z").expect(400);
		expect(response.body.error).toContain("fallo");
	});

	test("GET /records/paciente devuelve 500 en catch con CastError", async () => {
		const castError = new Error("fallo interno") as Error & { name: string };
		castError.name = "CastError";
		vi.spyOn(Patient, "findOne").mockRejectedValueOnce(castError);
		const response = await request(app).get("/records/paciente?dni=12345678Z").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /records/fechas devuelve 400 sin fechas", async () => {
		const response = await request(app).get("/records/fechas").expect(400);
		expect(response.body.error).toContain("fechaInicio y fechaFin");
	});

	test("GET /records/fechas filtra por rango y tipo", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-10",
			motivo: "A",
			diagnostico: "A",
			estado: "abierto",
		}).save();

		await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "ingreso hospitalario",
			fechaInicio: "2025-01-15",
			motivo: "B",
			diagnostico: "B",
			estado: "abierto",
		}).save();

		const noTipo = await request(app)
			.get("/records/fechas?fechaInicio=2025-01-01&fechaFin=2025-01-31")
			.expect(200);
		expect(noTipo.body).toHaveLength(2);

		const conTipo = await request(app)
			.get("/records/fechas?fechaInicio=2025-01-01&fechaFin=2025-01-31&tipo=consulta%20ambulatoria")
			.expect(200);
		expect(conTipo.body).toHaveLength(1);
		expect(conTipo.body[0].tipo).toBe("consulta ambulatoria");
	});

	test("GET /records/fechas devuelve 400 en catch con Error", async () => {
		vi.spyOn(Record, "find").mockImplementationOnce(() => {
			throw new Error("fallo");
		});
		const response = await request(app)
			.get("/records/fechas?fechaInicio=2025-01-01&fechaFin=2025-01-31")
			.expect(400);
		expect(response.body.error).toContain("fallo");
	});

	test("GET /records/fechas devuelve 500 en catch con CastError", async () => {
		const castError = new Error("fallo interno") as Error & { name: string };
		castError.name = "CastError";
		vi.spyOn(Record, "find").mockReturnValueOnce({
			sort: () => {
				throw castError;
			},
		} as unknown as ReturnType<typeof Record.find>);
		const response = await request(app)
			.get("/records/fechas?fechaInicio=2025-01-01&fechaFin=2025-01-31")
			.expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("GET /records/:id devuelve registro", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();
		const record = await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-10",
			motivo: "A",
			diagnostico: "A",
			estado: "abierto",
		}).save();

		const response = await request(app).get(`/records/${record._id.toString()}`).expect(200);
		expect(response.body._id).toBe(record._id.toString());
	});

	test("GET /records/:id devuelve 404 si no existe", async () => {
		await request(app).get("/records/507f1f77bcf86cd799439011").expect(404);
	});

	test("GET /records/:id devuelve 400 en catch con Error", async () => {
		vi.spyOn(Record, "findById").mockRejectedValueOnce(new Error("fallo"));
		const response = await request(app).get("/records/id-malformado").expect(400);
		expect(response.body.error).toContain("fallo");
	});

	test("GET /records/:id devuelve 500 en catch con CastError", async () => {
		const castError = new Error("fallo interno") as Error & { name: string };
		castError.name = "CastError";
		vi.spyOn(Record, "findById").mockRejectedValueOnce(castError);
		const response = await request(app).get("/records/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("PATCH /records/:id devuelve 404 si no existe", async () => {
		await request(app).patch("/records/507f1f77bcf86cd799439011").send({ motivo: "nuevo" }).expect(404);
	});

	test("PATCH /records/:id actualiza meds, paciente y medico", async () => {
		const patient1 = await new Patient(buildPatientPayload()).save();
		const patient2 = await new Patient({ ...buildPatientPayload(), dni: "87654321X" }).save();
		const staff1 = await new Staff(buildStaffPayload()).save();
		const staff2 = await new Staff({ ...buildStaffPayload(), numeroColegiado: "COL-ALT-001" }).save();
		const med1 = await new Medication(buildMedicationPayload({ codigoNacional: "CN-001", stock: 20, precio: 2 })).save();
		const med2 = await new Medication(buildMedicationPayload({ codigoNacional: "CN-002", stock: 15, precio: 4 })).save();

		med1.stock = 18;
		await med1.save();

		const initialRecord = await new Record({
			paciente: patient1._id,
			medicoResponsable: staff1._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "inicial",
			diagnostico: "inicial",
			estado: "abierto",
			medicamentosPrescritos: [{
				medicamento: med1._id,
				cantidad: 2,
				instruccionesAdministracion: "1 cada 8h",
			}],
			costeTotalMedicamentos: 4,
		}).save();

		const patchResponse = await request(app)
			.patch(`/records/${initialRecord._id.toString()}`)
			.send({
				dniPaciente: patient2.dni,
				numeroColegiadoMedico: staff2.numeroColegiado,
				medicamentos: [
					{
						codigoNacional: med2.codigoNacional,
						cantidad: 3,
						instruccionesAdministracion: "cada 12h",
					},
				],
				motivo: "actualizado",
			})
			.expect(200);

		expect(patchResponse.body.motivo).toBe("actualizado");
		expect(patchResponse.body.costeTotalMedicamentos).toBe(12);
		expect(patchResponse.body.paciente).toBe(patient2._id.toString());
		expect(patchResponse.body.medicoResponsable).toBe(staff2._id.toString());

		const med1Updated = await Medication.findById(med1._id);
		const med2Updated = await Medication.findById(med2._id);
		expect(med1Updated?.stock).toBe(20);
		expect(med2Updated?.stock).toBe(12);
	});

	test("PATCH /records/:id devuelve 400 en catch con Error", async () => {
		vi.spyOn(Record, "findById").mockRejectedValueOnce(new Error("fallo"));
		const response = await request(app).patch("/records/id-malformado").send({ motivo: "x" }).expect(400);
		expect(response.body.error).toContain("fallo");
	});

	test("PATCH /records/:id devuelve 500 en catch con CastError", async () => {
		const castError = new Error("fallo interno") as Error & { name: string };
		castError.name = "CastError";
		vi.spyOn(Record, "findById").mockRejectedValueOnce(castError);
		const response = await request(app).patch("/records/507f1f77bcf86cd799439011").send({ motivo: "x" }).expect(500);
		expect(response.body.error).toContain("fallo interno");
	});

	test("DELETE /records/:id devuelve 404 si no existe", async () => {
		await request(app).delete("/records/507f1f77bcf86cd799439011").expect(404);
	});

	test("DELETE /records/:id elimina y restaura stock", async () => {
		const patient = await new Patient(buildPatientPayload()).save();
		const staff = await new Staff(buildStaffPayload()).save();
		const med = await new Medication(buildMedicationPayload({ codigoNacional: "CN-DEL", stock: 20 })).save();

		med.stock = 16;
		await med.save();

		const record = await new Record({
			paciente: patient._id,
			medicoResponsable: staff._id,
			tipo: "consulta ambulatoria",
			fechaInicio: "2025-01-01",
			motivo: "inicial",
			diagnostico: "inicial",
			estado: "abierto",
			medicamentosPrescritos: [{
				medicamento: med._id,
				cantidad: 4,
				instruccionesAdministracion: "1 cada 8h",
			}],
			costeTotalMedicamentos: 10,
		}).save();

		await request(app).delete(`/records/${record._id.toString()}`).expect(200);
		const medAfterDelete = await Medication.findById(med._id);
		expect(medAfterDelete?.stock).toBe(20);
	});

	test("DELETE /records/:id devuelve 400 en catch con Error", async () => {
		vi.spyOn(Record, "findById").mockRejectedValueOnce(new Error("fallo"));
		const response = await request(app).delete("/records/id-malformado").expect(400);
		expect(response.body.error).toContain("fallo");
	});

	test("DELETE /records/:id devuelve 500 en catch con CastError", async () => {
		const castError = new Error("fallo interno") as Error & { name: string };
		castError.name = "CastError";
		vi.spyOn(Record, "findById").mockRejectedValueOnce(castError);
		const response = await request(app).delete("/records/507f1f77bcf86cd799439011").expect(500);
		expect(response.body.error).toContain("fallo interno");
	});
});
