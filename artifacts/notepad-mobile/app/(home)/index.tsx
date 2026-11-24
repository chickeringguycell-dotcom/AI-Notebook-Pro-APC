import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import {
  getListNotesQueryKey,
  useCreateNote,
  useListNotes,
  type Note,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function previewText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

interface SectionGroup {
  category: string;
  notes: Note[];
  hasPinned: boolean;
}

function groupNotes(notes: Note[]): SectionGroup[] {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const cat = n.category || "General";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(n);
  }
  const groups: SectionGroup[] = [];
  for (const [category, items] of map) {
    items.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    groups.push({ category, notes: items, hasPinned: items.some((n) => n.pinned) });
  }
  groups.sort((a, b) => {
    if (a.hasPinned !== b.hasPinned) return a.hasPinned ? -1 : 1;
    if (a.category === "General") return 1;
    if (b.category === "General") return -1;
    return a.category.localeCompare(b.category);
  });
  return groups;
}

type Row =
  | { kind: "header"; category: string }
  | { kind: "note"; note: Note };

export default function NotesListScreen() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { isPro } = useSubscription();
  const { data, isLoading, isError, refetch, isRefetching } = useListNotes();
  const createNote = useCreateNote();
  const [creating, setCreating] = useState(false);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const groups = groupNotes(data);
    const out: Row[] = [];
    for (const g of groups) {
      out.push({ kind: "header", category: g.category });
      for (const n of g.notes) out.push({ kind: "note", note: n });
    }
    return out;
  }, [data]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const note = await createNote.mutateAsync({
        data: { title: "New note", content: "" },
      });
      qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
      router.push(`/(home)/note/${note.id}` as any);
    } catch (e: any) {
      Alert.alert("Couldn't create note", e?.message ?? "Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", user?.primaryEmailAddress?.emailAddress ?? "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={handleSignOut} hitSlop={12}>
          <Ionicons name="person-circle-outline" size={28} color={c.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Notebook</Text>
        <View style={styles.headerActions}>
          {!isPro ? (
            <Link href={"/paywall" as any} asChild>
              <Pressable
                hitSlop={8}
                style={({ pressed }) => [
                  styles.upgradeBadge,
                  { backgroundColor: c.accent },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="sparkles" size={12} color={c.foreground} />
                <Text style={[styles.upgradeBadgeText, { color: c.foreground }]}>
                  Pro
                </Text>
              </Pressable>
            </Link>
          ) : null}
          <Pressable
            onPress={handleCreate}
            disabled={creating}
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.5 }]}
          >
            {creating ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Ionicons name="create-outline" size={26} color={c.primary} />
            )}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={42} color={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground, marginTop: 12 }]}>
            Couldn't load notes
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: c.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: c.primaryForeground, fontWeight: "600" }}>Retry</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={42} color={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground, marginTop: 12 }]}>
            No notes yet
          </Text>
          <Text style={[styles.emptyBody, { color: c.mutedForeground }]}>
            Tap the pencil to start writing
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) =>
            r.kind === "header" ? `h:${r.category}:${i}` : `n:${r.note.id}`
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={c.primary}
            />
          }
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <Text
                  style={[styles.sectionHeader, { color: c.mutedForeground }]}
                >
                  {item.category.toUpperCase()}
                </Text>
              );
            }
            const n = item.note;
            const preview = previewText(n.content);
            return (
              <Link href={`/(home)/note/${n.id}` as any} asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.noteRow,
                    { borderBottomColor: c.border },
                    pressed && { backgroundColor: c.card },
                  ]}
                >
                  <View style={styles.noteRowMain}>
                    <View style={styles.noteRowTop}>
                      {n.pinned ? (
                        <Ionicons
                          name="pin"
                          size={14}
                          color={c.accent}
                          style={{ marginRight: 6 }}
                        />
                      ) : null}
                      <Text
                        style={[styles.noteTitle, { color: c.foreground }]}
                        numberOfLines={1}
                      >
                        {n.title || "Untitled"}
                      </Text>
                    </View>
                    {preview ? (
                      <Text
                        style={[styles.notePreview, { color: c.mutedForeground }]}
                        numberOfLines={1}
                      >
                        {preview}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.noteDate, { color: c.mutedForeground }]}>
                    {formatDate(n.updatedAt)}
                  </Text>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  upgradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  upgradeBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  emptyBody: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4, textAlign: "center" },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  sectionHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noteRowMain: { flex: 1, marginRight: 12 },
  noteRowTop: { flexDirection: "row", alignItems: "center" },
  noteTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, flex: 1 },
  notePreview: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  noteDate: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
