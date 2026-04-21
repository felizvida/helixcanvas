import OpenAI from "openai";
import { SOURCE_POLICIES } from "../src/data/servier.js";
import { TEMPLATES } from "../src/data/templates.js";

const DEFAULT_MODEL = process.env.HELIXCANVAS_OPENAI_MODEL || "gpt-5.4";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const TEMPLATE_SUMMARY = TEMPLATES.map(
  (template) => `- ${template.id}: ${template.name} — ${template.summary}`,
).join("\n");

const SOURCE_SUMMARY = [
  ...SOURCE_POLICIES.map((policy) => `- ${policy.title}: ${policy.summary}`),
  "- Source buckets for asset suggestions: bioicons, servier-vector, servier-original, figurelabs-import.",
].join("\n");

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    figureGoal: { type: "string" },
    templateId: {
      type: "string",
      enum: TEMPLATES.map((template) => template.id),
    },
    panelSequence: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          heading: { type: "string" },
          body: { type: "string" },
          emphasis: {
            type: "string",
            enum: ["accent", "olive", "coral", "neutral"],
          },
          layoutHint: {
            type: "string",
            enum: ["lead", "mechanism", "support", "outcome"],
          },
        },
        required: ["heading", "body", "emphasis", "layoutHint"],
      },
    },
    callouts: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    assetQueries: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
          rationale: { type: "string" },
          preferredSourceBucket: {
            type: "string",
            enum: ["bioicons", "servier-vector", "servier-original", "figurelabs-import"],
          },
        },
        required: ["query", "rationale", "preferredSourceBucket"],
      },
    },
    complianceNotes: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    captionDraft: { type: "string" },
    nextStep: { type: "string" },
  },
  required: [
    "title",
    "summary",
    "figureGoal",
    "templateId",
    "panelSequence",
    "callouts",
    "assetQueries",
    "complianceNotes",
    "captionDraft",
    "nextStep",
  ],
};

const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall: { type: "string" },
    strengths: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    issues: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          title: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["severity", "title", "recommendation"],
      },
    },
    missingAssetOpportunities: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
          reason: { type: "string" },
          preferredSourceBucket: {
            type: "string",
            enum: ["bioicons", "servier-vector", "servier-original", "figurelabs-import"],
          },
        },
        required: ["query", "reason", "preferredSourceBucket"],
      },
    },
    complianceRisks: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
    },
    captionRevision: { type: "string" },
  },
  required: [
    "overall",
    "strengths",
    "issues",
    "missingAssetOpportunities",
    "complianceRisks",
    "captionRevision",
  ],
};

function assertConfigured() {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
}

function extractStructuredJson(response) {
  for (const item of response.output ?? []) {
    if (item.type !== "message") {
      continue;
    }

    for (const part of item.content ?? []) {
      if (part.type === "refusal") {
        throw new Error(part.refusal || "The model refused to fulfill this request.");
      }

      if (part.type === "output_text" && part.text) {
        return JSON.parse(part.text);
      }
    }
  }

  throw new Error("The model response did not include structured JSON output.");
}

function sanitizeProjectSummary(summary) {
  if (!summary || typeof summary !== "object") {
    return null;
  }

  const nodes = Array.isArray(summary.nodes) ? summary.nodes.slice(0, 8) : [];

  return {
    name: typeof summary.name === "string" ? summary.name : "",
    brief: typeof summary.brief === "string" ? summary.brief : "",
    board: summary.board && typeof summary.board === "object" ? summary.board : null,
    counts: summary.counts && typeof summary.counts === "object" ? summary.counts : null,
    nodes,
    citationsCount:
      typeof summary.citationsCount === "number" ? Math.max(summary.citationsCount, 0) : 0,
  };
}

function buildPlanPrompt({ brief, currentProject }) {
  const sanitizedProject = sanitizeProjectSummary(currentProject);

  return [
    "Create a figure plan for HelixCanvas.",
    "",
    `Research brief:\n${brief.trim()}`,
    "",
    sanitizedProject
      ? `Current project summary:\n${JSON.stringify(sanitizedProject, null, 2)}`
      : "Current project summary:\nNone provided.",
    "",
    "Requirements:",
    "- Stay faithful to the scientific brief and avoid inventing unsupported claims.",
    "- Optimize for publication-ready clarity, visual hierarchy, and tasteful scientific storytelling.",
    "- Recommend only the listed templates and source buckets.",
    "- Use concise panel headings and annotation copy.",
    "- Compliance notes should mention attribution or provenance review where relevant.",
  ].join("\n");
}

function buildCritiquePrompt({ brief, currentProject }) {
  const sanitizedProject = sanitizeProjectSummary(currentProject);

  return [
    "Critique a HelixCanvas biomedical illustration draft.",
    "",
    `Research brief:\n${brief.trim() || "No explicit brief provided."}`,
    "",
    `Current project summary:\n${JSON.stringify(sanitizedProject, null, 2)}`,
    "",
    "Evaluate for:",
    "- scientific clarity",
    "- visual hierarchy and readability",
    "- narrative flow between panels",
    "- asset/source compliance",
    "- caption quality",
    "",
    "Be specific, but concise and practical.",
  ].join("\n");
}

async function requestStructuredOutput({ systemPrompt, userPrompt, schemaName, schema, effort }) {
  assertConfigured();

  const response = await openai.responses.create({
    model: DEFAULT_MODEL,
    reasoning: { effort },
    store: false,
    max_output_tokens: 1600,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  return extractStructuredJson(response);
}

export function getAiConfig() {
  return {
    configured: Boolean(openai),
    model: DEFAULT_MODEL,
  };
}

export async function createFigurePlan({ brief, currentProject }) {
  const systemPrompt = [
    "You are the HelixCanvas AI copilot for biomedical research illustrations.",
    "Convert research briefs into production-friendly figure plans for a drag-and-drop editor.",
    "Choose the most appropriate built-in template and provide asset search guidance that fits open biomedical figure libraries.",
    "Do not expose chain-of-thought. Do not return markdown.",
    "",
    "Available templates:",
    TEMPLATE_SUMMARY,
    "",
    "Source guidance:",
    SOURCE_SUMMARY,
  ].join("\n");

  return requestStructuredOutput({
    systemPrompt,
    userPrompt: buildPlanPrompt({ brief, currentProject }),
    schemaName: "helixcanvas_figure_plan",
    schema: PLAN_SCHEMA,
    effort: "medium",
  });
}

export async function critiqueFigureProject({ brief, currentProject }) {
  const systemPrompt = [
    "You are the HelixCanvas AI art director and publication-clarity reviewer.",
    "Review the current illustration for figure quality, clarity, and source-aware compliance.",
    "Favor practical suggestions that can be applied inside a layout editor.",
    "Do not expose chain-of-thought. Do not return markdown.",
    "",
    "Available templates:",
    TEMPLATE_SUMMARY,
    "",
    "Source guidance:",
    SOURCE_SUMMARY,
  ].join("\n");

  return requestStructuredOutput({
    systemPrompt,
    userPrompt: buildCritiquePrompt({ brief, currentProject }),
    schemaName: "helixcanvas_figure_critique",
    schema: CRITIQUE_SCHEMA,
    effort: "low",
  });
}
