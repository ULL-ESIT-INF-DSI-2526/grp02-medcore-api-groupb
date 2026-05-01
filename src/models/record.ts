import { Document, Schema, model } from "mongoose";
import validator from "validator";

type RecordType = "consulta ambulatoria" | "ingreso hospitalario";
type RecordStatus = "abierto" | "cerrado";

interface PrescribedMedicationInterface {
  medication: Schema.Types.ObjectId,
  quantity: number,
  dosageInstructions: string
}

interface RecordDocumentInterface extends Document {
  patient: Schema.Types.ObjectId,
  responsibleDoctor: Schema.Types.ObjectId,
  type: RecordType,
  startDate: Date,
  endDate?: Date,
  reason: string,
  diagnosis: string,
  prescribedMedications: PrescribedMedicationInterface[],
  totalMedicationCost: number,
  status: RecordStatus
}

const recordTypeEnum: RecordType[] = ["consulta ambulatoria", "ingreso hospitalario"];
const recordStatusEnum: RecordStatus[] = ["abierto", "cerrado"];

const PrescribedMedicationSchema = new Schema({
  medication: {
    type: Schema.Types.ObjectId,
    ref: 'Medication',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'La cantidad debe ser mayor a 0']
  },
  dosageInstructions: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => validator.isLength(value.trim(), { min: 3 }),
      message: 'Las instrucciones de dosis deben tener al menos 3 caracteres'
    }
  }
}, { _id: false });

const RecordSchema = new Schema<RecordDocumentInterface>({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  responsibleDoctor: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  type: {
    type: String,
    enum: recordTypeEnum,
    required: true,
    validate: {
      validator: (value: string) => validator.isIn(value, recordTypeEnum),
      message: 'El tipo de registro no es válido'
    }
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date,
    required: false
  },
  reason: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => validator.isLength(value.trim(), { min: 3 }),
      message: 'La razón debe tener al menos 3 caracteres'
    }
  },
  diagnosis: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => validator.isLength(value.trim(), { min: 3 }),
      message: 'El diagnóstico debe tener al menos 3 caracteres'
    }
  },
  prescribedMedications: {
    type: [PrescribedMedicationSchema],
    default: []
  },
  totalMedicationCost: {
    type: Number,
    default: 0,
    min: [0, 'El costo total no puede ser negativo']
  },
  status: {
    type: String,
    enum: recordStatusEnum,
    required: true,
    validate: {
      validator: (value: string) => validator.isIn(value, recordStatusEnum),
      message: 'El estado del registro no es válido'
    }
  }
});

const Record = model<RecordDocumentInterface>('Record', RecordSchema);

export default Record;