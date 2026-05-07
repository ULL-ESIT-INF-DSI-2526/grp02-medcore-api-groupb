import { Document, Schema, model } from "mongoose";
import validator from "validator";

type RecordType = "consulta ambulatoria" | "ingreso hospitalario";
type RecordStatus = "abierto" | "cerrado";

interface PrescribedMedicationInterface {
  medicamento: Schema.Types.ObjectId,
  cantidad: number,
  instruccionesAdministracion: string
}

interface RecordDocumentInterface extends Document {
  paciente: Schema.Types.ObjectId,
  medicoResponsable: Schema.Types.ObjectId,
  tipo: RecordType,
  fechaInicio: Date,
  fechaFin?: Date,
  motivo: string,
  diagnostico: string,
  medicamentosPreescritos: PrescribedMedicationInterface[],
  costeTotalMedicamentos: number,
  estado: RecordStatus
}

const recordTypeEnum: RecordType[] = ["consulta ambulatoria", "ingreso hospitalario"];
const recordStatusEnum: RecordStatus[] = ["abierto", "cerrado"];

const PrescribedMedicationSchema = new Schema<PrescribedMedicationInterface>({
  medicamento: {
    type: Schema.Types.ObjectId,
    ref: 'Medication',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: [1, 'La cantidad debe ser mayor a 0']
  },
  instruccionesAdministracion: {
    type: String,
    required: true,
    validate: (value: string) => {
      if (!validator.isLength(value.trim(), { min: 3 })) {
        throw new Error('Las instrucciones de dosis deben tener al menos 3 caracteres');
      }
    },
  }
}, { _id: false });

const RecordSchema = new Schema<RecordDocumentInterface>({
  paciente: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  medicoResponsable: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  tipo: {
    type: String,
    enum: recordTypeEnum,
    required: true,
    validate: (value: string) => {
      if (!validator.isIn(value, recordTypeEnum)) {
        throw new Error('El tipo de registro no es válido');
      }
    },
  },
  fechaInicio: {
    type: Date,
    default: Date.now,
    required: true,
  },
  fechaFin: {
    type: Date,
    required: false,
  },
  motivo: {
    type: String,
    required: true,
    validate: (value: string) => {
      if (!validator.isLength(value.trim(), { min: 3 })) {
        throw new Error('La razón debe tener al menos 3 caracteres');
      }
    },
  },
  diagnostico: {
    type: String,
    required: true,
    validate: (value: string) => {
      if (!validator.isLength(value.trim(), { min: 3 })) {
        throw new Error('El diagnóstico debe tener al menos 3 caracteres');
      }
    },
  },
  medicamentosPreescritos: {
    type: [PrescribedMedicationSchema],
    default: []
  },
  costeTotalMedicamentos: {
    type: Number,
    default: 0,
    min: [0, 'El costo total no puede ser negativo']
  },
  estado: {
    type: String,
    enum: recordStatusEnum,
    required: true,
    validate: (value: string) => {
      if (!validator.isIn(value, recordStatusEnum)) {
        throw new Error('El estado del registro no es válido');
      }
    },
  }
});

export const Record = model<RecordDocumentInterface>('Record', RecordSchema);