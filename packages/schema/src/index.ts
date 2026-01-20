import { z } from "zod";

/**
 * EPIC 0 RULES:
 * - Resume input is structured JSON (no free-form resume blobs)
 * - JD is normalized text + extracted source metadata
 * - AI is NOT part of EPIC 0
 */

/** ---------- Core primitives ---------- */
export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const UrlString = z.string().url();

/** ---------- Resume schema (input) ---------- */
export const ResumeBasicsSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  location: z.string().min(1),
  links: z
    .array(
      z.object({
        label: z.string().min(1),
        url: UrlString
      })
    )
    .default([])
});

export const ResumeBulletSchema = z.object({
  id: z.string().min(1), // stable bullet id to track rewrite mapping
  text: z.string().min(3),
  // Optional evidence fields to prevent hallucinations later (Epic 4/5)
  // Keep empty now; will be used for validation later.
  claims: z
    .array(
      z.object({
        type: z.enum(["metric", "tech", "scope", "outcome"]),
        value: z.string().min(1)
      })
    )
    .default([])
});

export const ResumeExperienceSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().min(1).optional(),
  startDate: IsoDate,
  endDate: IsoDate.optional(), // omit if current
  bullets: z.array(ResumeBulletSchema).min(1)
});

export const ResumeProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tech: z.array(z.string().min(1)).default([]),
  bullets: z.array(ResumeBulletSchema).min(1),
  links: z
    .array(
      z.object({
        label: z.string().min(1),
        url: UrlString
      })
    )
    .default([])
});

export const ResumeSchema = z.object({
  version: z.literal(1),
  basics: ResumeBasicsSchema,
  headline: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  skills: z.array(z.string().min(1)).default([]),
  experience: z.array(ResumeExperienceSchema).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
  education: z
    .array(
      z.object({
        school: z.string().min(1),
        degree: z.string().min(1),
        startDate: IsoDate.optional(),
        endDate: IsoDate.optional()
      })
    )
    .default([])
});

/** ---------- JD normalized schema (input) ---------- */
export const JobDescriptionSourceSchema = z.object({
  sourceType: z.enum(["url", "text"]),
  sourceValue: z.string().min(1), // url or "inline"
  fetchedAt: z.string().datetime().optional()
});

export const NormalizedJDSchema = z.object({
  version: z.literal(1),
  source: JobDescriptionSourceSchema,
  title: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  text: z.string().min(20) // cleaned, normalized text
});

/** ---------- Compile request schema (input to orchestrator) ---------- */
export const CompilePrefsSchema = z.object({
  targetRole: z.string().min(1).optional(),
  // keep it honest: "alignment score", not "universal ATS score"
  scoringModel: z.enum(["keyword_alignment_v1"]).default("keyword_alignment_v1"),
  // later: choose template, 1-page enforcement, etc.
  template: z.enum(["one_page_v1"]).default("one_page_v1")
});

export const CompileRequestSchema = z.object({
  resume: ResumeSchema,
  jd: z.union([
    z.object({ type: z.literal("url"), url: UrlString }),
    z.object({ type: z.literal("text"), text: z.string().min(20) })
  ]),
  prefs: CompilePrefsSchema.default({})
});

/** ---------- Job output schema (metadata) ---------- */
export const JobStatusSchema = z.enum([
  "queued",
  "processing",
  "done",
  "failed"
]);

export const ArtifactSchema = z.object({
  kind: z.enum(["pdf", "ats_report_json", "diff_md"]),
  path: z.string().min(1) // local path or object key later
});

export const JobResultSchema = z.object({
  jobId: z.string().min(1),
  status: JobStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  inputHash: z.string().min(8),
  artifacts: z.array(ArtifactSchema).default([]),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional()
    })
    .optional()
});

/** ---------- Types ---------- */
export type Resume = z.infer<typeof ResumeSchema>;
export type NormalizedJD = z.infer<typeof NormalizedJDSchema>;
export type CompileRequest = z.infer<typeof CompileRequestSchema>;
export type JobResult = z.infer<typeof JobResultSchema>;
