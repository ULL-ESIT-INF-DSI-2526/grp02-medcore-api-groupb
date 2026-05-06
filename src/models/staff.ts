import { Document, Schema, model } from "mongoose";
import validator from "validator";

// Definición de tipos para las enumeraciones requeridas en el enunciado
type Especialidad = "medicina general" | "cardiología" | "traumatología" | "pediatría" | "oncología" | "urgencias" | "otra";
type CategoriaProfesional = "médico/a adjunto/a" | "médico/a residente" | "enfermero/a" | "auxiliar de enfermería" | "jefe/a de servicio";
type Turno = "mañana" | "tarde" | "noche" | "rotatorio";
type EstadoStaff = "activo" | "inactivo";

export interface StaffDocumentInterface extends Document {
  nombre: string;
  numeroColegiado: string;
  especialidad: Especialidad;
  categoriaProfesional: CategoriaProfesional;
  turno: Turno;
  consultaAsignada: string;
  experiencia: number;
  contactoDepartamento: string;
  estado: EstadoStaff;
}

const especialidadEnum: Especialidad[] = ["medicina general", "cardiología", "traumatología", "pediatría", "oncología", "urgencias", "otra"];
const categoriaEnum: CategoriaProfesional[] = ["médico/a adjunto/a", "médico/a residente", "enfermero/a", "auxiliar de enfermería", "jefe/a de servicio"];
const turnoEnum: Turno[] = ["mañana", "tarde", "noche", "rotatorio"];
const estadoEnum: EstadoStaff[] = ["activo", "inactivo"];

const StaffSchema = new Schema<StaffDocumentInterface>({
  nombre: {
    type: String,
    required: true,
    trim: true,
    validate: (value: string) => {
      // Validamos que tenga al menos 3 caracteres
      if (!validator.isLength(value.trim(), { min: 3 })) {
        throw new Error("El nombre completo debe tener al menos 3 caracteres");
      }
    }
  },
  numeroColegiado: {
    type: String,
    required: true,
    unique: true, // El enunciado pide que sea único en el sistema
    trim: true,
    validate: (value: string) => {
      if (validator.isEmpty(value.trim())) {
        throw new Error("El número de colegiado es obligatorio");
      }
    }
  },
  especialidad: {
    type: String,
    required: true,
    enum: especialidadEnum,
  },
  categoriaProfesional: {
    type: String,
    required: true,
    enum: categoriaEnum,
  },
  turno: {
    type: String,
    required: true,
    enum: turnoEnum,
  },
  consultaAsignada: {
    type: String,
    required: true,
    trim: true,
  },
  experiencia: {
    type: Number,
    required: true,
    min: [0, 'Los años de experiencia no pueden ser negativos'],
  },
  contactoDepartamento: {
    type: String,
    required: true,
    trim: true,
    validate: (value: string) => {
      if (validator.isEmpty(value.trim())) {
        throw new Error("Los datos de contacto del departamento son obligatorios");
      }
    }
  },
  estado: {
    type: String,
    required: true,
    enum: estadoEnum,
    default: "activo"
  }
});

export const Staff = model<StaffDocumentInterface>("Staff", StaffSchema);