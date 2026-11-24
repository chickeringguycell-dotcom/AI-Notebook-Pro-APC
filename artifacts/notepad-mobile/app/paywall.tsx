import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  REVENUECAT_ENTITLEMENT_IDENTIFIER,
  useSubscription,
} from "@/lib/revenuecat";

const PRO_FEATURES = [
  { icon: "color-palette-outline", text: "Premium paper themes & ink colors" },
  { icon: "image-outline", text: "Insert inline photos in notes" },
  { icon: "scan-outline", text: "Scan handwriting to text (OCR)" },
  { icon: "mic-outline", text: "Voice dictation with AI cleanup" },
  { icon: "sparkles-outline", text: "AI writing assistant" },
  { icon: "folder-outline", text: "Custom sections to organize notes" },
] as const;

export default function PaywallScreen() {
  const c = useColors();
  const router = useRouter();
  const {
    currentOffering,
    isPro,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
    isLoading,
  } = useSubscription();
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const monthlyPackage =
    currentOffering?.monthly ?? currentOffering?.availablePackages?.[0];
  const priceString = monthlyPackage?.product.priceString ?? "—";
  const productTitle = monthlyPackage?.product.title ?? "Pro";

  const handlePurchase = async () => {
    if (!monthlyPackage) return;
    setErrMsg(null);
    try {
      await purchase(monthlyPackage);
      Alert.alert(
        "You're Pro!",
        "Thanks for supporting My AI Notebook. All Pro features are now unlocked.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e: any) {
      if (e?.userCancelled) return;
      setErrMsg(e?.message ?? "Purchase failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    setErrMsg(null);
    try {
      const info = await restore();
      const hasPro =
        info.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !==
        undefined;
      Alert.alert(
        hasPro ? "Restored!" : "Nothing to restore",
        hasPro
          ? "Your Pro subscription is now active on this device."
          : "We couldn't find an active subscription on this account.",
      );
    } catch (e: any) {
      setErrMsg(e?.message ?? "Restore failed. Please try again.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top"]}
    >
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={c.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.heroIcon, { backgroundColor: c.accent }]}>
          <Ionicons name="sparkles" size={40} color={c.foreground} />
        </View>

        <Text style={[styles.title, { color: c.foreground }]}>
          {isPro ? "You're already Pro" : "Unlock My AI Notebook Pro"}
        </Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          {isPro
            ? "Thanks for supporting the app — every Pro feature is unlocked."
            : "Everything you need to capture ideas anywhere."}
        </Text>

        <View style={styles.features}>
          {PRO_FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View
                style={[styles.featureIcon, { backgroundColor: c.secondary }]}
              >
                <Ionicons name={f.icon as any} size={18} color={c.primary} />
              </View>
              <Text style={[styles.featureText, { color: c.foreground }]}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        {isPro ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: c.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.ctaText, { color: c.primaryForeground }]}>
              Back to my notes
            </Text>
          </Pressable>
        ) : isLoading || !monthlyPackage ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.loadingText, { color: c.mutedForeground }]}>
              Loading subscription details…
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={handlePurchase}
              disabled={isPurchasing}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: c.primary },
                isPurchasing && { opacity: 0.6 },
                pressed && { opacity: 0.85 },
              ]}
            >
              {isPurchasing ? (
                <ActivityIndicator color={c.primaryForeground} />
              ) : (
                <>
                  <Text
                    style={[styles.ctaText, { color: c.primaryForeground }]}
                  >
                    Go Pro — {priceString}/mo
                  </Text>
                  <Text
                    style={[styles.ctaSubtext, { color: c.primaryForeground }]}
                  >
                    {productTitle} · cancel anytime
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleRestore}
              disabled={isRestoring}
              style={({ pressed }) => [
                styles.restoreBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              {isRestoring ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <Text style={[styles.restoreText, { color: c.primary }]}>
                  Restore purchase
                </Text>
              )}
            </Pressable>
          </>
        )}

        {errMsg ? (
          <Text style={[styles.errorText, { color: c.destructive }]}>
            {errMsg}
          </Text>
        ) : null}

        <Text style={[styles.legal, { color: c.mutedForeground }]}>
          Subscription auto-renews monthly until cancelled. Manage in Google
          Play → Subscriptions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  scroll: { padding: 24, paddingBottom: 48, alignItems: "center" },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  features: { width: "100%", marginBottom: 32, gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontFamily: "Inter_500Medium", fontSize: 15, flex: 1 },
  cta: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaText: { fontFamily: "Inter_700Bold", fontSize: 17 },
  ctaSubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
    opacity: 0.85,
  },
  restoreBtn: { paddingVertical: 12 },
  restoreText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  loadingBox: { alignItems: "center", paddingVertical: 24 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8 },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  legal: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
});
