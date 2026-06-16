import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  title: z.string().min(1, "Judul wajib diisi").max(100),
  bio: z.string().max(2000).optional(),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().max(30).optional(),
  location: z.string().max(100).optional(),
  avatarId: z.string().optional(),
  resumeId: z.string().optional()
});

export const educationSchema = z.object({
  institution: z.string().min(1, "Institusi wajib diisi").max(200),
  degree: z.string().min(1, "Gelar wajib diisi").max(100),
  field: z.string().min(1, "Bidang studi wajib diisi").max(100),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().optional(),
  gpa: z.string().max(10).optional(),
  description: z.string().max(2000).optional(),
  order: z.coerce.number().int().min(0).optional(),
  logoId: z.string().optional()
});

export const contactSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().email("Format email tidak valid"),
  subject: z.string().min(3, "Subjek minimal 3 karakter").max(200),
  message: z.string().min(10, "Pesan minimal 10 karakter").max(3000)
});

export const projectSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(200),
  description: z.string().min(1, "Deskripsi wajib diisi").max(3000),
  demoUrl: z.string().url("URL tidak valid").optional().or(z.literal("")),
  repoUrl: z.string().url("URL tidak valid").optional().or(z.literal("")),
  featured: z.coerce.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ARCHIVED"]).optional(),
  coverId: z.string().optional()
});

export const experienceSchema = z.object({
  company: z.string().min(1, "Perusahaan wajib diisi").max(200),
  position: z.string().min(1, "Posisi wajib diisi").max(200),
  location: z.string().max(100).optional(),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().optional(),
  current: z.coerce.boolean().optional(),
  description: z.string().max(3000).optional(),
  order: z.coerce.number().int().min(0).optional(),
  logoId: z.string().optional()
});

export const volunteeringSchema = z.object({
  organization: z.string().min(1, "Organisasi wajib diisi").max(200),
  role: z.string().min(1, "Peran wajib diisi").max(200),
  location: z.string().max(100).optional(),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().optional(),
  current: z.coerce.boolean().optional(),
  description: z.string().max(3000).optional(),
  order: z.coerce.number().int().min(0).optional(),
  logoId: z.string().optional()
});

export type ValidationError = { field: string; message: string };

export function parseForm<T extends z.ZodType>(
  schema: T,
  form: FormData
): { data: z.infer<T> } | { errors: ValidationError[] } {
  const raw = Object.fromEntries(form.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map(i => ({
      field: i.path.join("."),
      message: i.message
    }));
    return { errors };
  }
  return { data: result.data };
}
