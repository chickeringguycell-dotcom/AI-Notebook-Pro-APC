import { useSignUp } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const c = useColors();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const submitting = fetchStatus === "fetching";

  const handleSubmit = async () => {
    setSubmitErr(null);
    try {
      const { error } = await signUp.password({ emailAddress, password });
      if (error) {
        setSubmitErr(error.message ?? "Sign up failed");
        return;
      }
      await signUp.verifications.sendEmailCode();
    } catch (e: any) {
      setSubmitErr(e?.message ?? "Sign up failed");
    }
  };

  const handleVerify = async () => {
    setSubmitErr(null);
    try {
      await signUp.verifications.verifyEmailCode({ code });
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/(home)");
            router.replace(url as Href);
          },
        });
      } else {
        setSubmitErr("Verification incomplete. Please try again.");
      }
    } catch (e: any) {
      setSubmitErr(e?.message ?? "Verification failed");
    }
  };

  const needsCode =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields?.includes("email_address") &&
    signUp.missingFields?.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.inner}>
          <Text style={[styles.brand, { color: c.primary }]}>My AI Notebook</Text>

          {needsCode ? (
            <>
              <Text style={[styles.title, { color: c.foreground }]}>Check your email</Text>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                Enter the 6-digit code we sent to {emailAddress}
              </Text>
              <Text style={[styles.label, { color: c.foreground }]}>Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={c.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                style={[
                  styles.input,
                  { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
                ]}
              />
              {submitErr ? (
                <Text style={[styles.error, { color: c.destructive }]}>{submitErr}</Text>
              ) : null}
              <Pressable
                onPress={handleVerify}
                disabled={code.length < 6 || submitting}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: c.primary },
                  (code.length < 6 || submitting) && { opacity: 0.5 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={c.primaryForeground} />
                ) : (
                  <Text style={[styles.buttonText, { color: c.primaryForeground }]}>Verify</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => signUp.verifications.sendEmailCode()}
                style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={{ color: c.primary, fontWeight: "600" }}>Resend code</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: c.foreground }]}>Create your account</Text>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                Your notes sync across all your devices
              </Text>

              <Text style={[styles.label, { color: c.foreground }]}>Email</Text>
              <TextInput
                value={emailAddress}
                onChangeText={setEmailAddress}
                placeholder="you@example.com"
                placeholderTextColor={c.mutedForeground}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={[
                  styles.input,
                  { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
                ]}
              />

              <Text style={[styles.label, { color: c.foreground, marginTop: 16 }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={c.mutedForeground}
                secureTextEntry
                autoComplete="password-new"
                style={[
                  styles.input,
                  { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
                ]}
              />

              {submitErr ? (
                <Text style={[styles.error, { color: c.destructive }]}>{submitErr}</Text>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!emailAddress || !password || submitting}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: c.primary },
                  (!emailAddress || !password || submitting) && { opacity: 0.5 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={c.primaryForeground} />
                ) : (
                  <Text style={[styles.buttonText, { color: c.primaryForeground }]}>
                    Create account
                  </Text>
                )}
              </Pressable>

              <View style={styles.linkRow}>
                <Text style={{ color: c.mutedForeground }}>Already have one? </Text>
                <Link href="/(auth)/sign-in" replace>
                  <Text style={{ color: c.primary, fontWeight: "600" }}>Sign in</Text>
                </Link>
              </View>
              <View nativeID="clerk-captcha" />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 48, justifyContent: "center" },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 24,
    textAlign: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, marginBottom: 32 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  error: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 12 },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  linkBtn: { marginTop: 16, alignItems: "center" },
});
