const DEFAULT_LIMIT = 12;

function createSnapshotId() {
  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProjectSnapshot(project, options = {}) {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const label = options.label?.trim() || `${project.name || "HelixCanvas figure"} · ${new Date(createdAt).toLocaleString()}`;

  return {
    id: options.id ?? createSnapshotId(),
    label,
    createdAt,
    fileName: options.fileName ?? "",
    savedUpdatedAt: options.savedUpdatedAt ?? null,
    project,
  };
}

export function pushProjectSnapshot(snapshots, snapshot, limit = DEFAULT_LIMIT) {
  return [snapshot, ...(snapshots ?? []).filter((item) => item.id !== snapshot.id)].slice(0, limit);
}

export function removeProjectSnapshot(snapshots, snapshotId) {
  return (snapshots ?? []).filter((snapshot) => snapshot.id !== snapshotId);
}

