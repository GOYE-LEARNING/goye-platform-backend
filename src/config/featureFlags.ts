// Simple env-driven feature flags. Off by default — a flag has to be
// explicitly set to "true" in the environment to turn a feature on.
export const AI_ENABLED = process.env.AI_ENABLED === "true";
