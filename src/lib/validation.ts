import { z } from 'zod'

// ========== AUTHENTICATION SCHEMAS ==========

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email or username is required')
    .max(255, 'Email or username too long')
    .refine(
      (value) => !value.includes('@') || z.string().email().safeParse(value).success,
      'Invalid email format'
    ),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password too long')
    .refine(
      (val) => !/<script|javascript:/i.test(val),
      'Invalid characters detected'
    ),
})

export type LoginInput = z.infer<typeof loginSchema>

// ========== PACKAGE ITEMS SCHEMAS ==========

export const packageItemSchema = z.object({
  designation: z
    .string()
    .trim()
    .min(1, 'Designation is required')
    .max(500, 'Designation too long (max 500 characters)')
    .refine(
      (val) => !/<script|javascript:/i.test(val),
      'Invalid characters detected'
    ),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100000, 'Quantity too large'),
  length: z
    .number()
    .positive('Length must be positive')
    .max(100000, 'Length too large')
    .nullable()
    .optional(),
  width: z
    .number()
    .positive('Width must be positive')
    .max(100000, 'Width too large')
    .nullable()
    .optional(),
  height: z
    .number()
    .positive('Height must be positive')
    .max(100000, 'Height too large')
    .nullable()
    .optional(),
})

export type PackageItemInput = z.infer<typeof packageItemSchema>

// ========== PACKAGE MATERIALS SCHEMAS ==========

export const packageMaterialSchema = z.object({
  material_variant_id: z
    .string()
    .uuid('Invalid material selection')
    .min(1, 'Material is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100000, 'Quantity too large'),
  unit_id: z.string().uuid('Invalid unit').nullable().optional(),
  length: z
    .number()
    .positive('Length must be positive')
    .max(100000, 'Length too large')
    .nullable()
    .optional(),
  width: z
    .number()
    .positive('Width must be positive')
    .max(100000, 'Width too large')
    .nullable()
    .optional(),
  height: z
    .number()
    .positive('Height must be positive')
    .max(100000, 'Height too large')
    .nullable()
    .optional(),
  comment: z
    .string()
    .trim()
    .max(2000, 'Comment too long (max 2000 characters)')
    .refine(
      (val) => !/<script|javascript:/i.test(val || ''),
      'Invalid characters detected in comment'
    )
    .nullable()
    .optional(),
  is_final: z.boolean().default(false),
})

export type PackageMaterialInput = z.infer<typeof packageMaterialSchema>

// ========== PACKAGE INFO SCHEMAS ==========

export const packageInfoSchema = z.object({
  internal_length: z
    .number()
    .positive('Internal length must be positive')
    .max(100000, 'Length too large')
    .nullable()
    .optional(),
  internal_width: z
    .number()
    .positive('Internal width must be positive')
    .max(100000, 'Width too large')
    .nullable()
    .optional(),
  internal_height: z
    .number()
    .positive('Internal height must be positive')
    .max(100000, 'Height too large')
    .nullable()
    .optional(),
  external_length: z
    .number()
    .positive('External length must be positive')
    .max(100000, 'Length too large')
    .nullable()
    .optional(),
  external_width: z
    .number()
    .positive('External width must be positive')
    .max(100000, 'Width too large')
    .nullable()
    .optional(),
  external_height: z
    .number()
    .positive('External height must be positive')
    .max(100000, 'Height too large')
    .nullable()
    .optional(),
  net_weight: z
    .number()
    .positive('Net weight must be positive')
    .max(1000000, 'Weight too large')
    .nullable()
    .optional(),
  gross_weight: z
    .number()
    .positive('Gross weight must be positive')
    .max(1000000, 'Weight too large')
    .nullable()
    .optional(),
  tare: z
    .number()
    .positive('Tare must be positive')
    .max(1000000, 'Tare too large')
    .nullable()
    .optional(),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be positive')
    .max(100000, 'Quantity too large')
    .nullable()
    .optional(),
  center_of_gravity: z
    .string()
    .trim()
    .max(500, 'Center of gravity description too long')
    .refine(
      (val) => !/<script|javascript:/i.test(val || ''),
      'Invalid characters detected'
    )
    .nullable()
    .optional(),
})

export type PackageInfoInput = z.infer<typeof packageInfoSchema>

// ========== ORDER COMMENT SCHEMA ==========

export const orderCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment too long (max 5000 characters)')
    .refine(
      (val) => !/<script|javascript:|<iframe|<object|<embed/i.test(val),
      'Invalid or unsafe content detected'
    ),
})

export type OrderCommentInput = z.infer<typeof orderCommentSchema>

// ========== ATTENDANCE LOG SCHEMA ==========

export const attendanceLogSchema = z.object({
  log_date: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid date'),
  shift_period: z.enum(['morning', 'afternoon'], {
    message: 'Shift must be morning or afternoon',
  }),
  status: z.enum(['present', 'absent'], {
    message: 'Status must be present or absent',
  }),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
})

export type AttendanceLogInput = z.infer<typeof attendanceLogSchema>

// ========== HELPER FUNCTIONS ==========

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and return errors as a flat object
 */
export function getValidationErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Record<string, string> | null {
  const result = schema.safeParse(data)
  if (result.success) return null

  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return errors
}

/**
 * Safe parse with typed result
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return { success: false, errors }
}
