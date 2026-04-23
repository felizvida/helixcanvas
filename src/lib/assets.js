export const SEARCH_ALIASES = {
  microscopy: ["confocal", "microscope", "imaging", "staining"],
  confocal: ["microscopy", "imaging", "laser"],
  receptor: ["membrane receptor", "cell surface receptor", "kinase"],
  membrane: ["plasma membrane", "cell surface", "receptor"],
  ligand: ["growth factor", "cytokine", "protein ligand"],
  signaling: ["cascade", "pathway", "relay", "transduction"],
  pathway: ["signaling", "cascade", "mechanism"],
  nucleus: ["nuclear", "transcription", "dna"],
  transcription: ["nucleus", "dna", "gene expression"],
  macrophage: ["monocyte", "innate immune cell", "phagocyte"],
  monocyte: ["macrophage", "innate immune cell"],
  immunology: ["immune", "macrophage", "cytokine", "antibody"],
  cytokine: ["immune signal", "ligand", "tnf", "interleukin"],
  retina: ["retinal", "photoreceptor", "eye", "neuron"],
  neuroscience: ["neuron", "retina", "glia", "synapse"],
  crispr: ["cas9", "editing", "knockout", "guide rna"],
  assay: ["workflow", "readout", "perturbation", "protocol"],
  timeline: ["timecourse", "time point", "pulse chase"],
  timecourse: ["timeline", "treatment window", "kinetics"],
  pathology: ["disease", "degeneration", "injury", "stress"],
  complement: ["antibody", "immune tagging", "immune complex"],
};

export function toggleFavoriteAssetId(ids, assetId) {
  if (!assetId) {
    return ids;
  }

  return ids.includes(assetId) ? ids.filter((id) => id !== assetId) : [assetId, ...ids];
}

export function pushRecentAsset(ids, assetId, limit = 16) {
  if (!assetId) {
    return ids;
  }

  return [assetId, ...ids.filter((id) => id !== assetId)].slice(0, limit);
}

export function isDuplicateImportedAsset(assets, candidate) {
  return assets.some((asset) => {
    if (candidate.assetUrl && asset.assetUrl && asset.assetUrl === candidate.assetUrl) {
      return true;
    }

    return asset.title === candidate.title && asset.assetType === candidate.assetType;
  });
}

function getRecentScore(assetId, recentAssetIds) {
  const index = recentAssetIds.indexOf(assetId);
  return index === -1 ? 0 : Math.max(0, recentAssetIds.length - index);
}

export function expandSearchTerms(query) {
  const rawTerms = String(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  const terms = new Set(rawTerms);

  rawTerms.forEach((term) => {
    const aliases = SEARCH_ALIASES[term] ?? [];

    aliases.forEach((alias) => {
      alias
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter(Boolean)
        .forEach((token) => terms.add(token));
    });
  });

  return [...terms];
}

export function matchesAssetSearchQuery(asset, query) {
  if (!query?.trim()) {
    return true;
  }

  return getSearchMatchScore(asset, query) > 0;
}

export function getSearchMatchScore(asset, query) {
  const normalizedQuery = query.toLowerCase().trim();
  const expandedTerms = expandSearchTerms(normalizedQuery);
  const haystack = [
    asset.title,
    asset.searchText,
    asset.categoryLabel,
    asset.sourceLabel,
    asset.originLabel,
    asset.packTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (haystack.includes(normalizedQuery)) {
    score += 10;
  }

  expandedTerms.forEach((term) => {
    if (asset.title?.toLowerCase().includes(term)) {
      score += 4;
    }
    if (asset.searchText?.includes(term)) {
      score += 3;
    }
    if (asset.categoryLabel?.toLowerCase().includes(term)) {
      score += 2;
    }
    if (asset.packTitle?.toLowerCase().includes(term)) {
      score += 1;
    }
  });

  return score;
}

export function getAssetMatchScore(asset, suggestion) {
  const query = suggestion.query.toLowerCase();
  const terms = expandSearchTerms(query);
  let score = getSearchMatchScore(asset, query);

  if (asset.sourceBucket === suggestion.preferredSourceBucket) {
    score += 6;
  }

  for (const term of terms) {
    if (asset.title?.toLowerCase().includes(term)) {
      score += 2;
    }
    if (asset.searchText?.includes(term)) {
      score += 1;
    }
  }

  return score;
}

export function buildAiSuggestions(suggestions, library) {
  return suggestions.map((suggestion) => {
    const matches = [...library]
      .map((asset) => ({
        asset,
        score: getAssetMatchScore(asset, suggestion),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.asset.title.localeCompare(right.asset.title))
      .slice(0, 4)
      .map((item) => item.asset);

    return {
      ...suggestion,
      matches,
    };
  });
}

export function buildRelatedSearchQueries(query, limit = 6) {
  const baseQuery = String(query ?? "").trim().toLowerCase();

  if (!baseQuery) {
    return [];
  }

  const rawTerms = baseQuery.split(/[^a-z0-9]+/i).filter(Boolean);
  const aliasSuggestions = [];
  const combinedSuggestions = [];

  rawTerms.forEach((term) => {
    const aliases = SEARCH_ALIASES[term] ?? [];

    aliases.forEach((alias) => {
      if (!aliasSuggestions.includes(alias)) {
        aliasSuggestions.push(alias);
      }
      const suggestion = [baseQuery, alias].filter(Boolean).join(" ");
      if (!combinedSuggestions.includes(suggestion)) {
        combinedSuggestions.push(suggestion);
      }
    });
  });

  return [...aliasSuggestions, ...combinedSuggestions].slice(0, limit);
}

export function sortLibraryAssets(
  assets,
  { sortMode, favoriteAssetIds = [], recentAssetIds = [], usedAssetIds = [] },
) {
  return [...assets].sort((left, right) => {
    if (sortMode === "alphabetical") {
      return left.title.localeCompare(right.title);
    }

    const leftFavorite = favoriteAssetIds.includes(left.id) ? 1 : 0;
    const rightFavorite = favoriteAssetIds.includes(right.id) ? 1 : 0;
    const leftRecent = getRecentScore(left.id, recentAssetIds);
    const rightRecent = getRecentScore(right.id, recentAssetIds);
    const leftUsed = usedAssetIds.includes(left.id) ? 1 : 0;
    const rightUsed = usedAssetIds.includes(right.id) ? 1 : 0;

    if (sortMode === "favorites") {
      return (
        rightFavorite - leftFavorite ||
        rightUsed - leftUsed ||
        rightRecent - leftRecent ||
        left.title.localeCompare(right.title)
      );
    }

    if (sortMode === "recent") {
      return (
        rightRecent - leftRecent ||
        rightFavorite - leftFavorite ||
        rightUsed - leftUsed ||
        left.title.localeCompare(right.title)
      );
    }

    return (
      rightFavorite - leftFavorite ||
      rightUsed - leftUsed ||
      rightRecent - leftRecent ||
      left.title.localeCompare(right.title)
    );
  });
}
