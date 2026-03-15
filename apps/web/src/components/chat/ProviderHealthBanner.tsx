import { type ServerProviderStatus } from "@t3tools/contracts";
import { memo } from "react";
import { PROVIDER_OPTIONS } from "../../session-logic";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { CircleAlertIcon } from "lucide-react";

function getProviderLabel(provider: ServerProviderStatus["provider"]): string {
  return PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ?? provider;
}

export const ProviderHealthBanner = memo(function ProviderHealthBanner({
  status,
}: {
  status: ServerProviderStatus | null;
}) {
  if (!status || status.status === "ready") {
    return null;
  }

  const defaultMessage =
    status.status === "error"
      ? `${getProviderLabel(status.provider)} provider is unavailable.`
      : `${getProviderLabel(status.provider)} provider has limited availability.`;
  const providerLabel = getProviderLabel(status.provider);

  return (
    <div className="pt-3 mx-auto max-w-3xl">
      <Alert variant={status.status === "error" ? "error" : "warning"}>
        <CircleAlertIcon />
        <AlertTitle>{`${providerLabel} provider status`}</AlertTitle>
        <AlertDescription className="line-clamp-3" title={status.message ?? defaultMessage}>
          {status.message ?? defaultMessage}
        </AlertDescription>
      </Alert>
    </div>
  );
});
