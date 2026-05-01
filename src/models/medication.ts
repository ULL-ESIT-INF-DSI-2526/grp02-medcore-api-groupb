import { Document, Schema, model } from "mongoose";
import validator from "validator";

type FormaFarmaceutica = "comprimido" | "cápsula" | "solución oral" | "solución inyectable" | "pomada" | "parche transdérmico" | "inhalador" | "otras";
type ViaAdministracion = "oral" | "intravenosa" | "intramuscular" | "subcutánea" | "tópica" | "inhalatoria";

interface MedicationDocumentInterface extends Document {
  nombre: string,
  ingredienteActivo: string,
  codigoNacional: string,
  formaFarmaceutica: FormaFarmaceutica,
  dosisEstandar: number, // mg
  genero: "hombre" | "mujer",
  viaAdministracion: ViaAdministracion,
  stock: number,
  precio: number,
  prescripcion: boolean,
  caducidadStock?: Date,
  contraindicaciones: string[],

}

const formaFarmaceuticaEnum: FormaFarmaceutica[] = ["comprimido", "cápsula", "solución oral", "solución inyectable", "pomada", "parche transdérmico", "inhalador", "otras"];
const viaAdministracionEnum: ViaAdministracion[] = ["oral", "intravenosa", "intramuscular", "subcutánea", "tópica", "inhalatoria"];

const MedicationSchema = new Schema<MedicationDocumentInterface>({
  nombre: {
    type: String,
    required: true,
    minlength: [3, 'El nombre comercial debe tener al menos 3 caracteres'],
    trim: true
  },
  ingredienteActivo: {
    type: String,
    required: true,
    minlength: [3, 'El ingrediente activo debe tener al menos 3 caracteres'],
    trim: true
  },
  codigoNacional: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: (v: string) => typeof v === 'string' && v.length > 0,
      message: 'El código nacional es obligatorio'
    }
  },
  formaFarmaceutica: {
    type: String,
    enum: formaFarmaceuticaEnum,
    required: true
  },
  dosisEstandar: {
    type: Number,
    required: true,
    min: [0, 'La dosis estándar no puede ser negativa']
  },
  genero: {
    type: String,
    enum: ["hombre", "mujer"],
    required: false
  },
  viaAdministracion: {
    type: String,
    enum: viaAdministracionEnum,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'El stock mínimo es 0'],
    default: 0
  },
  precio: {
    type: Number,
    required: true,
    min: [0, 'El precio por unidad no puede ser negativo']
  },
  prescripcion: {
    type: Boolean,
    default: false
  },
  caducidadStock: {
    type: Date,
    required: false
  },
  contraindicaciones: {
    type: [String],
    default: []
  }
});

MedicationSchema.index({ codigoNacional: 1 }, { unique: true });

const Medication = model<MedicationDocumentInterface>('Medication', MedicationSchema);

export default Medication;