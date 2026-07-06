import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStudents,
  useCreateBehaviorLog,
  useListBehaviorCategories,
  getListStudentsQueryKey,
  getListBehaviorCategoriesQueryKey,
  getGetStudentQueryKey,
} from "@workspace/api-client-react";
import type { StudentWithState, BehaviorCategory } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Search, X, Award, ThumbsDown, Check, ChevronLeft } from "lucide-react";

/**
 * QuickBehaviorSheet — log a merit or demerit in 2 taps from anywhere.
 *
 * Modes:
 *  - Pre-filled student (from Scan result or Student profile): type → save.
 *  - Blank (from the floating FAB): search student → type → save.
 *
 * Uses only existing generated hooks — no OpenAPI/codegen changes required.
 */

export interface QuickBehaviorTarget {
  id: number;
  firstName: string;
  lastName: string;
  grade?: string | null;
  className?: string | null;
}

interface QuickBehaviorSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-selected student (skips the search step). */
  student?: QuickBehaviorTarget | null;
  /** Optional initial type when opened from a +Merit / −Demerit button. */
  initialType?: "merit" | "demerit";
}

function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function QuickBehaviorSheet({
  open,
  onClose,
  student: presetStudent,
  initialType,
}: QuickBehaviorSheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selected, setSelected] = useState<QuickBehaviorTarget | null>(presetStudent ?? null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<"merit" | "demerit">(initialType ?? "merit");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset state each time the sheet opens.
  useEffect(() => {
    if (open) {
      setSelected(presetStudent ?? null);
      setType(initialType ?? "merit");
      setCategoryId(null);
      setNote("");
      setSearch("");
      setDebounced("");
    }
  }, [open, presetStudent, initialType]);

  // Focus the search box when opened without a student.
  useEffect(() => {
    if (!open || selected) return undefined;
    const t = setTimeout(() => searchRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [open, selected]);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const searchParams = useMemo(
    () => (debounced ? { search: debounced } : undefined),
    [debounced]
  );

  const { data: results, isFetching: searching } = useListStudents(searchParams, {
    query: {
      queryKey: getListStudentsQueryKey(searchParams),
      enabled: open && !selected && debounced.length >= 2,
      staleTime: 15000,
    },
  });

  const { data: categories } = useListBehaviorCategories({
    query: {
      queryKey: getListBehaviorCategoriesQueryKey(),
      enabled: open,
      staleTime: 5 * 60 * 1000,
    },
  });

  const typedCategories = useMemo(
    () => (categories ?? []).filter((c: BehaviorCategory) => c.type === type),
    [categories, type]
  );

  const selectedCategory = useMemo(
    () => typedCategories.find((c) => c.id === categoryId) ?? null,
    [typedCategories, categoryId]
  );

  const points = selectedCategory
    ? selectedCategory.points
    : type === "merit"
    ? 1
    : -1;

  const mutation = useCreateBehaviorLog({
    mutation: {
      onSuccess: () => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(30);
        }
        toast({
          title: type === "merit" ? "Merit recorded" : "Demerit recorded",
          description: selected
            ? `${selected.firstName} ${selected.lastName} · ${points > 0 ? "+" : ""}${points} pt${Math.abs(points) === 1 ? "" : "s"}`
            : undefined,
        });
        if (selected) {
          queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(selected.id) });
        }
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        onClose();
      },
      onError: () => {
        toast({
          title: "Could not save",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
      },
    },
  });

  function handleSubmit() {
    if (!selected || mutation.isPending) return;
    mutation.mutate({
      data: {
        studentId: selected.id,
        categoryId: selectedCategory ? selectedCategory.id : null,
        type,
        points,
        note: note.trim() || (selectedCategory ? selectedCategory.name : `Quick ${type}`),
      },
    });
  }

  function pickStudent(s: StudentWithState) {
    setSelected({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      className: s.className,
    });
  }

  if (!open) return null;

  const searchResults = (results ?? []).slice(0, 8);

  return (
    <div className="fixed inset-0 z-[60]" data-testid="quick-behavior-sheet">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Sheet (bottom on mobile, centered card on desktop) */}
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center pointer-events-none">
        <div className="pointer-events-auto bg-background rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-2xl border-t md:border border-border animate-in slide-in-from-bottom md:zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
          {/* Grab handle (mobile) */}
          <div className="md:hidden pt-2 pb-1 flex justify-center">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-4 pt-2 pb-3 flex items-center gap-2 border-b border-border">
            {selected && !presetStudent && (
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors"
                data-testid="button-behavior-back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-bold text-foreground flex-1">
              {selected ? "Log behavior" : "Who is this for?"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              data-testid="button-behavior-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* ── Step 1: student search ── */}
            {!selected && (
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or student ID..."
                    className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="input-behavior-search"
                  />
                </div>

                {debounced.length < 2 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Type at least 2 characters to find a student
                  </p>
                ) : searching ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Searching…</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No students match “{debounced}”
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-card">
                    {searchResults.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => pickStudent(s)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 active:bg-muted transition-colors text-left"
                        data-testid={`behavior-search-result-${s.id}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {initials(s.firstName, s.lastName)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[s.grade ? `Grade ${s.grade}` : null, s.className]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: type + category + note ── */}
            {selected && (
              <div className="p-4 space-y-4">
                {/* Student chip */}
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {initials(selected.firstName, selected.lastName)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selected.firstName} {selected.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[selected.grade ? `Grade ${selected.grade}` : null, selected.className]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                {/* Merit / Demerit toggle */}
                <div className="grid grid-cols-2 gap-2" data-testid="behavior-type-toggle">
                  <button
                    onClick={() => { setType("merit"); setCategoryId(null); }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      type === "merit"
                        ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                        : "border-border bg-card text-muted-foreground hover:border-green-500/40"
                    }`}
                    data-testid="button-type-merit"
                  >
                    <Award className="w-4 h-4" />
                    Merit
                  </button>
                  <button
                    onClick={() => { setType("demerit"); setCategoryId(null); }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      type === "demerit"
                        ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                        : "border-border bg-card text-muted-foreground hover:border-red-500/40"
                    }`}
                    data-testid="button-type-demerit"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Demerit
                  </button>
                </div>

                {/* Category chips (optional) */}
                {typedCategories.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Category <span className="normal-case font-normal">(optional)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {typedCategories.map((c) => {
                        const active = categoryId === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setCategoryId(active ? null : c.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              active
                                ? type === "merit"
                                  ? "bg-green-500/15 border-green-500 text-green-700 dark:text-green-400"
                                  : "bg-red-500/15 border-red-500 text-red-700 dark:text-red-400"
                                : "bg-card border-border text-muted-foreground hover:text-foreground"
                            }`}
                            data-testid={`behavior-category-${c.id}`}
                          >
                            {c.name}
                            <span className="ml-1 opacity-70">
                              {c.points > 0 ? `+${c.points}` : c.points}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Note (optional) */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="input-behavior-note"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          {selected && (
            <div className="p-4 pt-2 border-t border-border safe-bottom">
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-60 ${
                  type === "merit"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                data-testid="button-behavior-submit"
              >
                <Check className="w-4 h-4" />
                {mutation.isPending
                  ? "Saving…"
                  : `Save ${type} (${points > 0 ? "+" : ""}${points} pt${Math.abs(points) === 1 ? "" : "s"})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * QuickBehaviorFab — floating "+/-" button that opens the sheet in search mode.
 * Sits above the bottom nav on mobile; bottom-right on desktop.
 */
export function QuickBehaviorFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Log merit or demerit"
        data-testid="fab-quick-behavior"
      >
        <Award className="w-6 h-6" />
      </button>
      <QuickBehaviorSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
