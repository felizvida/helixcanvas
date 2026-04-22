async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "The AI service returned an error.");
  }

  return payload;
}

export async function fetchAiHealth() {
  const response = await fetch("/api/ai/health");
  return parseJsonResponse(response);
}

export async function requestFigurePlan(input) {
  const response = await fetch("/api/ai/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse(response);
}

export async function requestFigureCritique(input) {
  const response = await fetch("/api/ai/critique", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse(response);
}

export async function requestFigureEdit(input) {
  const response = await fetch("/api/ai/edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse(response);
}
