export function normalizeBaseUrl(baseUrl = "/") {
  const value = String(baseUrl || "/").trim();

  if (!value || value === "/") {
    return "/";
  }

  return value.startsWith("/") ? `${value.replace(/\/?$/, "/")}` : `/${value.replace(/\/?$/, "/")}`;
}

export function resolveAppUrl(path = "", baseUrl = "/") {
  if (!path) {
    return normalizeBaseUrl(baseUrl);
  }

  if (/^(?:[a-z]+:|data:|blob:|#)/i.test(path)) {
    return path;
  }

  const normalizedBase = normalizeBaseUrl(baseUrl);
  const relativePath = String(path).replace(/^\/+/, "");

  return normalizedBase === "/" ? `/${relativePath}` : `${normalizedBase}${relativePath}`;
}

function withResolvedAssetUrls(asset, baseUrl) {
  return {
    ...asset,
    assetUrl: resolveAppUrl(asset.assetUrl, baseUrl),
    previewUrl: resolveAppUrl(asset.previewUrl ?? asset.assetUrl, baseUrl),
  };
}

export function applyAppBaseToPack(pack, baseUrl = "/") {
  return {
    ...pack,
    assets: (pack.assets ?? []).map((asset) => withResolvedAssetUrls(asset, baseUrl)),
  };
}

export function applyAppBaseToPacks(packs, baseUrl = "/") {
  return (packs ?? []).map((pack) => applyAppBaseToPack(pack, baseUrl));
}
