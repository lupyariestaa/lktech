export function isWebhookTokenRequired(nodeEnv: string | undefined): boolean {
  return nodeEnv === "production";
}

export function webhookTokenConfiguration(nodeEnv: string | undefined, token: string | undefined): {
  required: boolean;
  configured: boolean;
  secure: boolean;
} {
  const required = isWebhookTokenRequired(nodeEnv);
  const configured = Boolean(token?.trim());
  return { required, configured, secure: !required || configured };
}
