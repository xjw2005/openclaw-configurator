import { spawnSync } from "node:child_process";

export interface OpenclawModel {
  key: string;
  name: string;
  input: string;
  contextWindow: number;
  local: boolean;
  available: boolean;
  tags: string[];
  missing: boolean;
}

export interface OpenclawModelsResult {
  count: number;
  models: OpenclawModel[];
}

export interface ProviderConfig {
  baseUrl: string;
  models: string[];
}

export interface VendorFilter {
  providers: SupportedProvider[];
  models: string[];
}

const SUPPORTED_PROVIDERS = ["openai", "anthropic"] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

// PackyCode supported models (model name suffix after provider prefix)
const PACKYCODE_MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-sonnet-20241022",
  "claude-3-7-sonnet-20250219",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-codex",
  "gpt-5-pro",
  "gpt-5.1",
  "gpt-5.1-codex",
  "gpt-5.1-codex-max",
  "gpt-5.2",
  "gpt-5.2-pro",
];

export const VENDOR_FILTERS: Record<string, VendorFilter> = {
  packycode: {
    providers: ["openai", "anthropic"],
    models: PACKYCODE_MODELS,
  },
  other: {
    providers: [],
    models: [],
  },
};

export function isSupportedProvider(
  key: string,
  allowedProviders?: SupportedProvider[]
): SupportedProvider | null {
  const providers = allowedProviders ?? SUPPORTED_PROVIDERS;
  for (const provider of providers) {
    if (key.startsWith(`${provider}/`)) {
      return provider;
    }
  }
  return null;
}

export function getModelSuffix(key: string): string {
  const slashIndex = key.indexOf("/");
  return slashIndex >= 0 ? key.slice(slashIndex + 1) : key;
}

export function fetchModels(): OpenclawModelsResult {
  const result = spawnSync("openclaw", ["models", "list", "--all", "--json"], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to fetch models");
  }
  return JSON.parse(result.stdout) as OpenclawModelsResult;
}

export function filterModelsByVendor(
  models: OpenclawModel[],
  vendor: string
): OpenclawModel[] {
  const filter = VENDOR_FILTERS[vendor];
  if (!filter) {
    return models;
  }

  // If no filters specified (other vendor), return all models
  if (filter.providers.length === 0 && filter.models.length === 0) {
    return models;
  }

  return models.filter((m) => {
    // Check provider prefix
    const provider = isSupportedProvider(m.key, filter.providers);
    if (!provider) {
      return false;
    }

    // If model filter is empty, accept all models from allowed providers
    if (filter.models.length === 0) {
      return true;
    }

    // Check model name suffix
    const modelSuffix = getModelSuffix(m.key);
    return filter.models.includes(modelSuffix);
  });
}

export function setModelsMode(mode: string): void {
  const result = spawnSync("openclaw", ["config", "set", "models.mode", mode], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to set models mode");
  }
}

export function setProviderConfig(
  provider: SupportedProvider,
  config: ProviderConfig
): void {
  setModelsMode("merge");
  const json = JSON.stringify(config);
  const result = spawnSync(
    "openclaw",
    ["config", "set", `models.providers.${provider}`, json],
    { encoding: "utf-8" }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to set provider config");
  }
}
