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

export function getAssetMatchScore(asset, suggestion) {
  const query = suggestion.query.toLowerCase();
  const terms = query.split(/[^a-z0-9]+/i).filter(Boolean);
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

  if (asset.sourceBucket === suggestion.preferredSourceBucket) {
    score += 6;
  }

  if (haystack.includes(query)) {
    score += 8;
  }

  for (const term of terms) {
    if (asset.title?.toLowerCase().includes(term)) {
      score += 5;
    }
    if (asset.searchText?.includes(term)) {
      score += 4;
    }
    if (asset.categoryLabel?.toLowerCase().includes(term)) {
      score += 2;
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
