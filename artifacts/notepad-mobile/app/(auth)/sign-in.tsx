import { useSignIn } from "@clerk/expo";
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

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const c = useColors();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const submitting = fetchStatus === "fetching";

  const handleSubmit = async () => {
    setSubmitErr(null);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setSubmitErr(error.message ?? "Sign in failed");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/(home)");
            router.replace(url as Href);
          },
        });
      } else {
        setSubmitErr("Additional verification required. Please use the web app.");
      }
    } catch (e: any) {
      setSubmitErr(e?.message ?? "Sign in failed");
    }
  };

  const fieldErr =
    errors?.fields?.identifier?.message ??
    errors?.fields?.password?.message ??
    submitErr;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.inner}>
          <Text style={[styles.brand, { color: c.primary }]}>My AI Notebook</Text>
          <Text style={[styles.title, { color: c.foreground }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Sign in to access your notes
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
            placeholder="Your password"
            placeholderTextColor={c.mutedForeground}
            secureTextEntry
            autoComplete="password"
            style={[
              styles.input,
              { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
            ]}
          />

          {fieldErr ? (
            <Text style={[styles.error, { color: c.destructive }]}>{fieldErr}</Text>
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
              <Text style={[styles.buttonText, { color: c.primaryForeground }]}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Text style={{ color: c.mutedForeground }}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" replace>
              <Text style={{ color: c.primary, fontWeight: "600" }}>Sign up</Text>
            </Link>
          </View>
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
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 12,
  },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
});
