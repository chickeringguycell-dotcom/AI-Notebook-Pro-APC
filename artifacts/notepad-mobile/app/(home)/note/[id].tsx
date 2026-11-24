import { Ionicons } from "@expo/vector-icons";
import {
  getListNotesQueryKey,
  useDeleteNote,
  useGetNote,
  useUpdateNote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function htmlToPlain(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainToHtml(text: string): string {
  if (!text.trim()) return "";
  return text
    .split(/\n\n+/)
    .map((para) => {
      const escaped = para
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      return `<p>${escaped}</p>`;
    })
    .join("");
}

export default function NoteScreen() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const noteId = Number(params.id);

  const { data: note, isLoading, isError } = useGetNote(noteId);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ title: "", body: "", pinned: false });
  const updateMutationRef = useRef(updateNote);
  updateMutationRef.current = updateNote;

  useEffect(() => {
    if (note && !loaded) {
      const initialBody = htmlToPlain(note.content);
      setTitle(note.title);
      setBody(initialBody);
      setPinned(note.pinned);
      lastSaved.current = {
        title: note.title,
        body: initialBody,
        pinned: note.pinned,
      };
      setLoaded(true);
    }
  }, [note, loaded]);

  const flushSave = async (next: { title: string; body: string; pinned: boolean }) => {
    const titleDirty = next.title !== lastSaved.current.title;
    const bodyDirty = next.body !== lastSaved.current.body;
    const pinnedDirty = next.pinned !== lastSaved.current.pinned;
    if (!titleDirty && !bodyDirty && !pinnedDirty) return;

    // Only send fields that actually changed. Critically, never re-serialize
    // body to HTML if the user didn't touch it — that would flatten any rich
    // HTML / inline photos written from the web app.
    const data: { title?: string; content?: string; pinned?: boolean } = {};
    if (titleDirty) data.title = next.title;
    if (bodyDirty) data.content = plainToHtml(next.body);
    if (pinnedDirty) data.pinned = next.pinned;

    setSaving(true);
    try {
      await updateMutationRef.current.mutateAsync({ id: noteId, data });
      lastSaved.current = { ...next };
      qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
    } catch {
      // best-effort autosave; user can retry by editing
    } finally {
      setSaving(false);
    }
  };

  const pendingSave = useRef<{ title: string; body: string; pinned: boolean } | null>(null);

  const scheduleSave = (next: { title: string; body: string; pinned: boolean }) => {
    pendingSave.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      const snapshot = pendingSave.current;
      pendingSave.current = null;
      if (snapshot) void flushSave(snapshot);
    }, 800);
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    scheduleSave({ title: v, body, pinned });
  };
  const onBodyChange = (v: string) => {
    setBody(v);
    scheduleSave({ title, body: v, pinned });
  };
  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    scheduleSave({ title, body, pinned: next });
  };

  useEffect(() => {
    return () => {
      // Flush any pending autosave so quick back-navigation doesn't lose edits.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const snapshot = pendingSave.current;
      pendingSave.current = null;
      if (snapshot) void flushSave(snapshot);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = () => {
    Alert.alert("Delete note?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote.mutateAsync({ id: noteId });
            qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
            router.back();
          } catch (e: any) {
            Alert.alert("Couldn't delete", e?.message ?? "Try again.");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={c.mutedForeground} />
          <Text style={[styles.errorText, { color: c.foreground }]}>
            Couldn't load this note
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: c.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: c.primaryForeground, fontWeight: "600" }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={c.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          {saving ? (
            <Text style={[styles.savingText, { color: c.mutedForeground }]}>Saving…</Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={togglePin} hitSlop={12} style={{ marginRight: 18 }}>
            <Ionicons
              name={pinned ? "pin" : "pin-outline"}
              size={22}
              color={pinned ? c.accent : c.primary}
            />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={12}>
            <Ionicons name="trash-outline" size={22} color={c.destructive} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            value={title}
            onChangeText={onTitleChange}
            placeholder="Title"
            placeholderTextColor={c.mutedForeground}
            style={[styles.titleInput, { color: c.foreground }]}
          />
          <TextInput
            value={body}
            onChangeText={onBodyChange}
            placeholder="Start writing…"
            placeholderTextColor={c.mutedForeground}
            multiline
            textAlignVertical="top"
            style={[styles.bodyInput, { color: c.foreground }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontFamily: "Inter_600SemiBold", fontSize: 17, marginTop: 12 },
  backBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  savingText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  scroll: { padding: 20, paddingBottom: 80 },
  titleInput: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    paddingVertical: 8,
    marginBottom: 4,
  },
  bodyInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    lineHeight: 28,
    minHeight: 400,
  },
});
