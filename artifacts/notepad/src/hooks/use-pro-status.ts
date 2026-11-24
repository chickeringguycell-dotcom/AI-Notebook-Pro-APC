import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { track } from "@/lib/analytics";

const PRO_KEY = "notepad-pro";

function writeLocalPro(value: boolean) {
  try {
    if (value) {
      localStorage.setItem(PRO_KEY, "true");
    }
  } catch {
    // ignore
  }
}

export function useProStatus() {
  const queryClient = useQueryClient();

  // Paid upfront Play Store / Sovereign Edition: 100% unlocked with zero internal paywalls.
  const isPro = true;

  const unlockWithCode = async (code: string): Promise<boolean> => {
    const normalized = code.trim().toUpperCase();
    writeLocalPro(true);
    track("pro_redeemed", { code: normalized });
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    return true;
  };

  return { isPro, unlockWithCode };
}
