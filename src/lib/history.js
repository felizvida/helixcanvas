const HISTORY_LIMIT = 60;

export function createHistoryState() {
  return {
    past: [],
    future: [],
  };
}

export function pushHistoryState(history, currentProject) {
  return {
    past: [...history.past, currentProject].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export function undoHistoryState(history, currentProject) {
  const previousProject = history.past.at(-1);

  if (!previousProject) {
    return {
      changed: false,
      project: currentProject,
      history,
    };
  }

  return {
    changed: true,
    project: previousProject,
    history: {
      past: history.past.slice(0, -1),
      future: [currentProject, ...history.future].slice(0, HISTORY_LIMIT),
    },
  };
}

export function redoHistoryState(history, currentProject) {
  const nextProject = history.future[0];

  if (!nextProject) {
    return {
      changed: false,
      project: currentProject,
      history,
    };
  }

  return {
    changed: true,
    project: nextProject,
    history: {
      past: [...history.past, currentProject].slice(-HISTORY_LIMIT),
      future: history.future.slice(1),
    },
  };
}
