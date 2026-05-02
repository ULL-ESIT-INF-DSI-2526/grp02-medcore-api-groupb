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
  viaAdministracion: ViaAdministracion,
  stock: number,
  precio: number,
  prescripcion: boolean,
  caducidadStock: Date,
  contraindicaciones: string[],

}

const formaFarmaceuticaEnum: FormaFarmaceutica[] = ["comprimido", "cápsula", "solución oral", "solución inyectable", "pomada", "parche transdérmico", "inhalador", "otras"];
const viaAdministracionEnum: ViaAdministracion[] = ["oral", "intravenosa", "intramuscular", "subcutánea", "tópica", "inhalatoria"];

const MedicationSchema = new Schema<MedicationDocumentInterface>({
  nombre: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value: string) => validator.isLength(value.trim(), { min: 3 }),
      message: 'El nombre comercial debe tener al menos 3 caracteres'
    }
  },
  ingredienteActivo: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value: string) => validator.isLength(value.trim(), { min: 3 }),
      message: 'El ingrediente activo debe tener al menos 3 caracteres'
    }
  },
  codigoNacional: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: (value: string) => !validator.isEmpty(value.trim()),
      message: 'El código nacional es obligatorio'
    }
  },
  formaFarmaceutica: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => validator.isIn(value, formaFarmaceuticaEnum),
      message: 'La forma farmacéutica no es válida'
    }
  },
  dosisEstandar: {
    type: Number,
    required: true,
    min: [0, 'La dosis estándar no puede ser negativa']
  },
  viaAdministracion: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => validator.isIn(value, viaAdministracionEnum),
      message: 'La vía de administración no es válida'
    }
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