import swaggerJSDoc, { Options } from "swagger-jsdoc";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hospital REST API",
      version: "1.0.0",
      description: "REST API para la gestión hospitalaria",
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER || "http://localhost:3000",
      },
    ],
    components: {
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              example: "Mensaje de error descriptivo",
            },
          },
        },
        Patient: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60c72b2f9b1d8b001c8e4b8a" },
            nombre: { type: "string", example: "Juan Perez" },
            fechaNacimiento: { type: "string", format: "date", example: "1990-01-01" },
            dni: { type: "string", example: "11111111H" },
            numSeguridadSocial: { type: "string", example: "123456789012" },
            genero: { type: "string", example: "hombre" },
            direccion: { type: "string", example: "Calle Falsa 123" },
            telefono: { type: "string", example: "600123456" },
            correo: { type: "string", example: "juan@example.com" },
            alergias: { type: "array", items: { type: "string" }, example: ["Polen", "Penicilina"] },
            grupoSanguineo: { type: "string", example: "0+" },
            estado: { type: "string", example: "activo" },
          },
        },
        Medication: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60c72b2f9b1d8b001c8e4b8b" },
            nombre: { type: "string", example: "Ibuprofeno" },
            principioActivo: { type: "string", example: "Ibuprofeno" },
            codigoNacional: { type: "string", example: "123456" },
            formaFarmaceutica: { type: "string", example: "comprimido" },
            dosisEstandar: { type: "integer", example: 600 },
            unidadMedida: { type: "string", example: "mg" },
            viaAdministracion: { type: "string", example: "oral" },
            stock: { type: "integer", example: 50 },
            precio: { type: "number", example: 5.50 },
            prescripcion: { type: "boolean", example: true },
            caducidadStock: { type: "string", format: "date", example: "2030-01-01" },
            contraindicaciones: { type: "array", items: { type: "string" }, example: [] },
          },
        },
        Record: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60c72b2f9b1d8b001c8e4b8c" },
            paciente: { type: "string", example: "60c72b2f9b1d8b001c8e4b8a" },
            medicoResponsable: { type: "string", example: "60c72b2f9b1d8b001c8e4b8d" },
            tipo: { type: "string", example: "consulta ambulatoria" },
            fechaInicio: { type: "string", format: "date-time", example: "2023-10-27T10:00:00.000Z" },
            motivo: { type: "string", example: "Dolor crónico" },
            diagnostico: { type: "string", example: "Migraña" },
            estado: { type: "string", example: "cerrado" },
            costeTotalMedicamentos: { type: "number", example: 15.50 },
            medicamentosPrescritos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  medicamento: { type: "string", example: "60c72b2f9b1d8b001c8e4b8b" },
                  cantidad: { type: "integer", example: 2 },
                  instruccionesAdministracion: { type: "string", example: "Tomar cada 8 horas" }
                }
              }
            }
          },
        },
        RecordCreate: {
          type: "object",
          required: ["dniPaciente", "numeroColegiadoMedico", "tipo", "motivo", "diagnostico", "estado"],
          properties: {
            dniPaciente: { type: "string", example: "11111111H" },
            numeroColegiadoMedico: { type: "string", example: "COL-1234" },
            tipo: { type: "string", example: "consulta ambulatoria" },
            motivo: { type: "string", example: "Dolor crónico" },
            diagnostico: { type: "string", example: "Migraña" },
            estado: { type: "string", example: "cerrado" },
            medicamentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigoNacional: { type: "string", example: "123456" },
                  cantidad: { type: "integer", example: 2 },
                  instruccionesAdministracion: { type: "string", example: "Tomar cada 8 horas" }
                }
              }
            }
          }
        }
      },
    },
  },

  apis: ["./src/routers/*.ts", "./dist/routers/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);