const PROJECT_FILE_FORMAT = "helixcanvas-project";
const PROJECT_FILE_VERSION = 1;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProjectShape(project) {
  return (
    isObject(project) &&
    isObject(project.board) &&
    Array.isArray(project.nodes) &&
    Array.isArray(project.connectors)
  );
}

export function suggestProjectFilename(projectName = "helixcanvas-project") {
  const stem = String(projectName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${stem || "helixcanvas-project"}.helixcanvas.json`;
}

export function createProjectDocument(project) {
  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  };
}

export function parseProjectDocument(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (isProjectShape(parsed)) {
    return {
      project: parsed,
      meta: {
        format: "raw-json",
        version: 0,
      },
    };
  }

  if (
    isObject(parsed) &&
    parsed.format === PROJECT_FILE_FORMAT &&
    Number.isInteger(parsed.version) &&
    isProjectShape(parsed.project)
  ) {
    return {
      project: parsed.project,
      meta: {
        format: parsed.format,
        version: parsed.version,
        exportedAt: parsed.exportedAt ?? "",
      },
    };
  }

  throw new Error("That file does not look like a HelixCanvas project.");
}
