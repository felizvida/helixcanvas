import OpenAI from "openai";
import { SOURCE_POLICIES } from "../src/data/servier.js";
import { TEMPLATES } from "../src/data/templates.js";

const DEFAULT_MODEL = process.env.HELIXCANVAS_OPENAI_MODEL || "gpt-5.4";
const DEFAULT_IMAGE_MODEL = process.env.HELIXCANVAS_OPENAI_IMAGE_MODEL || "gpt-image-2";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const IMAGE_QUALITIES = new Set(["auto", "low", "medium", "high"]);
const IMAGE_OUTPUT_FORMATS = new Set(["png", "jpeg", "webp"]);
const IMAGE_SIZES = new Set([
  "auto",
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "2048x2048",
  "2048x1152",
  "3840x2160",
  "2160x3840",
]);

const IMAGE_STYLE_PRESETS = {
  "publication-vector": [
    "Visual mode: crisp publication-ready biomedical vector illustration.",
    "Use clean shapes, restrained gradients, strong figure-ground contrast, and editable-looking components.",
  ],
  "graphical-abstract": [
    "Visual mode: modern graphical abstract centerpiece.",
    "Use a bold editorial composition, generous negative space, and a polished scientific-magazine look.",
  ],
  "mechanism-panel": [
    "Visual mode: mechanistic pathway panel.",
    "Use clear compartments, directional flow, biomolecule silhouettes, and space for downstream labels.",
  ],
  "microscopy-inspired": [
    "Visual mode: microscopy-inspired research visual.",
    "Use dark-field contrast, fluorescent channel aesthetics, and a clean panel-ready crop without fake scale bars.",
  ],
};

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

const EDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    confidence: { type: "string" },
    actions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          actionType: {
            type: "string",
            enum: [
              "set_project_meta",
              "update_node_text",
              "update_node_style",
              "update_node_layout",
              "update_connector",
              "add_callout",
              "add_comment",
              "focus_library_search",
            ],
          },
          nodeId: { type: "string" },
          connectorId: { type: "string" },
          projectName: { type: "string" },
          brief: { type: "string" },
          text: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          author: { type: "string" },
          label: { type: "string" },
          query: { type: "string" },
          preferredSourceBucket: {
            type: "string",
            enum: ["bioicons", "servier-vector", "servier-original", "figurelabs-import"],
          },
          kind: {
            type: "string",
            enum: ["activation", "inhibition", "neutral"],
          },
          route: {
            type: "string",
            enum: ["straight", "elbow"],
          },
          fontFamily: {
            type: "string",
            enum: ["sans", "serif", "grotesk", "mono"],
          },
          textAlign: {
            type: "string",
            enum: ["left", "center", "right"],
          },
          fontSize: { type: "number" },
          fontWeight: { type: "number" },
          lineHeight: { type: "number" },
          strokeWidth: { type: "number" },
          color: { type: "string" },
          fill: { type: "string" },
          stroke: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          w: { type: "number" },
          h: { type: "number" },
        },
        required: ["actionType"],
      },
    },
    followUp: { type: "string" },
  },
  required: ["summary", "confidence", "actions", "followUp"],
};

function assertConfigured() {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
}

function sanitizeEnum(value, allowedValues, fallbackValue) {
  return allowedValues.has(value) ? value : fallbackValue;
}

function buildBiomedicalImagePrompt({ prompt, stylePreset }) {
  const styleLines = IMAGE_STYLE_PRESETS[stylePreset] ?? IMAGE_STYLE_PRESETS["publication-vector"];

  return [
    "Create a biomedical research illustration asset for HelixCanvas.",
    "",
    "User request:",
    prompt.trim(),
    "",
    ...styleLines,
    "",
    "Scientific and design guardrails:",
    "- Keep the visual useful as a figure component, not a complete paper figure unless explicitly requested.",
    "- Do not invent unsupported claims, fake data, p-values, citations, gene labels, or clinical advice.",
    "- Avoid watermarks, logos, signatures, UI chrome, and stock-photo text.",
    "- Prefer clean composition, high readability, and tasteful modern biomedical design.",
    "- If labels are requested, keep text sparse and large enough to edit around in the HelixCanvas scene.",
  ].join("\n");
}

function getMimeType(outputFormat) {
  if (outputFormat === "jpeg") {
    return "image/jpeg";
  }

  if (outputFormat === "webp") {
    return "image/webp";
  }

  return "image/png";
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

function buildEditPrompt({ instruction, currentProject }) {
  return [
    "Edit the current HelixCanvas figure using structured scene-graph actions.",
    "",
    `User instruction:\n${instruction.trim()}`,
    "",
    `Current project context:\n${JSON.stringify(currentProject, null, 2)}`,
    "",
    "Rules:",
    "- Use only ids that already exist in the provided project context.",
    "- Prefer editing the current selection if it is relevant to the instruction.",
    "- Keep the number of actions minimal and high-value.",
    "- If the request is ambiguous, add a review comment instead of making a risky scientific claim.",
    "- Use focus_library_search when the best next step is to surface missing assets rather than invent them.",
    "- Do not expose chain-of-thought. Do not return markdown.",
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
    imageModel: DEFAULT_IMAGE_MODEL,
  };
}

export async function generateFigureImage({
  prompt,
  stylePreset = "publication-vector",
  size = "1024x1024",
  quality = "medium",
  outputFormat = "png",
} = {}) {
  assertConfigured();

  const userPrompt = typeof prompt === "string" ? prompt.trim() : "";

  if (!userPrompt) {
    throw new Error("An image prompt is required.");
  }

  const normalizedSize = sanitizeEnum(size, IMAGE_SIZES, "1024x1024");
  const normalizedQuality = sanitizeEnum(quality, IMAGE_QUALITIES, "medium");
  const normalizedOutputFormat = sanitizeEnum(outputFormat, IMAGE_OUTPUT_FORMATS, "png");
  const imagePrompt = buildBiomedicalImagePrompt({ prompt: userPrompt, stylePreset });

  const response = await openai.images.generate({
    model: DEFAULT_IMAGE_MODEL,
    prompt: imagePrompt,
    n: 1,
    size: normalizedSize,
    quality: normalizedQuality,
    output_format: normalizedOutputFormat,
    background: "auto",
  });

  const image = response.data?.[0];

  if (!image?.b64_json) {
    throw new Error("The image model did not return base64 image data.");
  }

  const mimeType = getMimeType(normalizedOutputFormat);

  return {
    model: DEFAULT_IMAGE_MODEL,
    prompt: userPrompt,
    resolvedPrompt: imagePrompt,
    size: normalizedSize,
    quality: normalizedQuality,
    outputFormat: normalizedOutputFormat,
    mimeType,
    dataUrl: `data:${mimeType};base64,${image.b64_json}`,
    usage: response.usage ?? null,
    created: response.created ?? null,
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

export async function editFigureProject({ instruction, currentProject }) {
  const systemPrompt = [
    "You are the HelixCanvas AI figure editor.",
    "Turn user instructions into safe, structured edits for a local-first biomedical illustration scene graph.",
    "You may update text, styling, connector semantics, layout, comments, and search focus suggestions.",
    "Do not invent unsupported science. If the request is unclear, leave a comment instead of hallucinating content.",
    "",
    "Available templates:",
    TEMPLATE_SUMMARY,
    "",
    "Source guidance:",
    SOURCE_SUMMARY,
  ].join("\n");

  return requestStructuredOutput({
    systemPrompt,
    userPrompt: buildEditPrompt({ instruction, currentProject }),
    schemaName: "helixcanvas_figure_edit",
    schema: EDIT_SCHEMA,
    effort: "medium",
  });
}
