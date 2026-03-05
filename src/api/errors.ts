export interface FieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly fields: FieldError[]

  constructor(message: string, status: number, fields: FieldError[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fields = fields
  }

  fieldMessage(field: string): string | undefined {
    return this.fields.find(f => f.field === field)?.message
  }
}