import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { track } from "@/lib/analytics";
import {
  FREE_AI_LIMIT,
  consumeOneFreeAiTry,
  consumeOneFreeScan,
  getFreeAiTriesLeft,
  getFreeScansLeft,
  getLiveSubscriptionPrices,
  isUserEntitledToPro,
  redeemVipProCode,
  restoreGooglePlaySubscriptions,
  startGooglePlaySubscription,
} from "@/lib/play-billing";

export function useProStatus() {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    window.addEventListener("ainotebook:pro-updated", refresh);
    return () => window.removeEventListener("ainotebook:pro-updated", refresh);
  }, []);

  const isPro = isUserEntitledToPro();
  const aiTriesLeft = getFreeAiTriesLeft();
  const scansLeft = getFreeScansLeft();
  const { yearlyPrice, monthlyPrice, strikeYearlyPrice } = getLiveSubscriptionPrices();

  const subscribePlan = useCallback(
    async (plan: "yearly" | "monthly") => {
      setBillingBusy(true);
      try {
        const res = await startGooglePlaySubscription(plan);
        if (res.ok) {
          track("pro_subscribed", { plan });
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        }
        return res;
      } finally {
        setBillingBusy(false);
      }
    },
    [queryClient],
  );

  const restoreProPurchases = useCallback(async () => {
    setBillingBusy(true);
    try {
      const res = await restoreGooglePlaySubscriptions();
      if (res.restored) {
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
      return res;
    } finally {
      setBillingBusy(false);
    }
  }, [queryClient]);

  const unlockWithCode = async (code: string): Promise<boolean> => {
    const ok = redeemVipProCode(code);
    if (ok) {
      track("pro_redeemed", { code: code.trim().toUpperCase() });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    }
    return ok;
  };

  return {
    isPro,
    aiTriesLeft,
    freeAiLimit: FREE_AI_LIMIT,
    scansLeft,
    consumeAiTry: consumeOneFreeAiTry,
    consumeScanTry: consumeOneFreeScan,
    subscribePlan,
    restoreProPurchases,
    unlockWithCode,
    yearlyPrice,
    monthlyPrice,
    strikeYearlyPrice,
    billingBusy,
  };
}
