import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createFigurePlan, critiqueFigureProject, editFigureProject, getAiConfig } from "./aiService.mjs";

const app = express();
const port = Number(process.env.HELIXCANVAS_API_PORT || 8787);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

function sendError(res, error, status = 500) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  res.status(status).json({ error: message });
}

app.get("/api/ai/health", (_req, res) => {
  res.json(getAiConfig());
});

app.post("/api/ai/plan", async (req, res) => {
  try {
    const brief = typeof req.body?.brief === "string" ? req.body.brief.trim() : "";

    if (!brief) {
      sendError(res, new Error("A research brief is required for AI drafting."), 400);
      return;
    }

    if (!getAiConfig().configured) {
      sendError(
        res,
        new Error("OPENAI_API_KEY is missing. Configure the server environment to enable AI drafting."),
        503,
      );
      return;
    }

    const plan = await createFigurePlan({
      brief,
      currentProject: req.body?.currentProject ?? null,
    });

    res.json({
      plan,
      model: getAiConfig().model,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/ai/critique", async (req, res) => {
  try {
    const currentProject = req.body?.currentProject ?? null;

    if (!currentProject) {
      sendError(res, new Error("A current project summary is required for AI critique."), 400);
      return;
    }

    if (!getAiConfig().configured) {
      sendError(
        res,
        new Error("OPENAI_API_KEY is missing. Configure the server environment to enable AI critique."),
        503,
      );
      return;
    }

    const critique = await critiqueFigureProject({
      brief: typeof req.body?.brief === "string" ? req.body.brief : "",
      currentProject,
    });

    res.json({
      critique,
      model: getAiConfig().model,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/ai/edit", async (req, res) => {
  try {
    const instruction =
      typeof req.body?.instruction === "string" ? req.body.instruction.trim() : "";
    const currentProject = req.body?.currentProject ?? null;

    if (!instruction) {
      sendError(res, new Error("An edit instruction is required for AI editing."), 400);
      return;
    }

    if (!currentProject) {
      sendError(res, new Error("A current project context is required for AI editing."), 400);
      return;
    }

    if (!getAiConfig().configured) {
      sendError(
        res,
        new Error("OPENAI_API_KEY is missing. Configure the server environment to enable AI editing."),
        503,
      );
      return;
    }

    const edit = await editFigureProject({
      instruction,
      currentProject,
    });

    res.json({
      edit,
      model: getAiConfig().model,
    });
  } catch (error) {
    sendError(res, error);
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  const config = getAiConfig();
  console.log(
    `[helixcanvas] api listening on http://127.0.0.1:${port} (model: ${config.model}, configured: ${config.configured})`,
  );
});
