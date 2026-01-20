import express from "express";
import crypto from "crypto";
import { CompileRequestSchema, JobResultSchema } from "@resume/schema";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "resume-api", epic: 0 });
});

// In EPIC 0 we do NOT run queues.
// We only validate inputs and return a mock job object.
app.post("/jobs", (req, res) => {
  const parsed = CompileRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: parsed.error.flatten()
    });
  }

  const inputHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(parsed.data))
    .digest("hex");

  const now = new Date().toISOString();
  const job = JobResultSchema.parse({
    jobId: crypto.randomUUID(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    inputHash,
    artifacts: []
  });

  res.json({ ok: true, job });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[resume-api] listening on http://localhost:${port}`);
});
