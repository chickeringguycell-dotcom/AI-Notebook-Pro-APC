import { useAuth, useUser } from "@clerk/expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useRef } from "react";
import Purchases from "react-native-purchases";

export default function HomeLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const tokenGetterRef = useRef(getToken);
  tokenGetterRef.current = getToken;

  // Register token getter synchronously during render — before any child
  // query fires — so the very first /api/notes request includes the bearer.
  setAuthTokenGetter(() => tokenGetterRef.current());

  // Bind RevenueCat identity to the Clerk user so purchases/entitlements
  // follow the user across devices and don't leak across sign-out.
  useEffect(() => {
    if (!user?.id) return;
    Purchases.logIn(user.id).catch((err) => {
      console.warn("RevenueCat logIn failed:", err?.message ?? err);
    });
  }, [user?.id]);

  useEffect(() => {
    return () => {
      setAuthTokenGetter(null);
      Purchases.logOut().catch(() => {
        /* no-op: logout-on-unmount is best effort */
      });
    };
  }, []);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
