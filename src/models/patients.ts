import { Document, Schema, model } from "mongoose";
import validator from "validator";

interface PatientDocumentInterface extends Document {
  nombre: string,
  fechaNacimiento: Date,
  dni: string,
  numSeguridadSocial: string,
  genero: "hombre" | "mujer",
  direccion: string,
  telefono: string,
  correo: string,
  alergias: string[],
  grupoSanguineo: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "0+" | "0-",
  estado: "activo" | "baja temporal" | "fallecido",
}

const PatientSchema = new Schema<PatientDocumentInterface>({
  nombre: {
    type: String,
    required: true,
    validate: (value: string) => {
      if (!validator.default.isAlpha(value, "es-ES", { ignore: " " })) {
        throw new Error("El nombre introducido no es válido");
      }
    }
  },
  fechaNacimiento: {
    type: Date,
    required: true,
    validate: (value: Date) => {
      const fechaActual: Date = new Date();
      if (value > fechaActual) {
        throw new Error("La fecha de nacimiento no puede ser posterior a la actual");
      }
    },
  },
  dni: {
    type: String,
    required: true,
    unique: true,
    validate: (value: string) => {
      if (!validator.default.isIdentityCard(value, "ES")) {
        throw new Error("El dni introducido no es válido");
      }
    },
  },
  numSeguridadSocial: {
    type: String,
    required: true,
    unique: true,
    validate: (value: string) => {
      if (value.length != 12) {
        throw new Error("El número de la seguridad social introducido no es válido");
      }
    },
  },
  genero: {
    type: String,
    required: true,
    enum: ["hombre", "mujer"],
  },
  direccion: {
    type: String,
    required: true,
  },
  telefono: {
    type: String,
    required: true,
    validate: (value: string) => {
      if (!validator.default.isMobilePhone(value, "es-ES")) {
        throw new Error("El número de teléfono introducido no es válido");
      }
    }
  },
  correo: {
    type: String,
    required: true,
    validate: (value: string) => {
      if (!validator.default.isEmail(value)) {
        throw new Error("El correo introducido no es válido");
      }
    }
  },
  alergias: {
    type: [String],
    required: true,
    default: [],
  },
  grupoSanguineo: {
    type: String,
    required: true,
    enum: ["A+" , "A-" , "B+" , "B-" , "AB+" , "AB-" , "0+" , "0-"],
  },
  estado: {
    type: String,
    required: true,
    enum: ["activo", "baja temporal", "fallecido"],
  },
});

export const Patient = model<PatientDocumentInterface>("Patient", PatientSchema);