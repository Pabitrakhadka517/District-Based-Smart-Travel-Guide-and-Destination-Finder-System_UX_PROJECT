"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Clock, MapPin, Pencil, ChevronsUpDown, Sparkles, GripVertical, Inbox,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TripDay, TripActivity, TripPlan, Destination, TouristAttraction, Trek } from "@/types";
import { dateRange, fmtDay, nanoid } from "./planner-utils";
import { buildSuggestedItinerary } from "./itinerary-suggestions";

interface Props {
  plan: TripPlan;
  destinations: Destination[];
  attractions: TouristAttraction[];
  treks: Trek[];
  onChange: (days: TripDay[]) => void;
}

const ACTIVITY_TYPES = [
  { value: "destination", label: "Destination", color: "text-brand-600 bg-brand-50"    },
  { value: "attraction",  label: "Attraction",  color: "text-secondary bg-secondary/10"  },
  { value: "trek",        label: "Trek",        color: "text-success bg-success/10"     },
  { value: "custom",      label: "Custom",      color: "text-muted-foreground bg-muted" },
] as const;

type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"];

function blankDaysFromRange(plan: TripPlan): TripDay[] {
  const dates = dateRange(plan.startDate, plan.endDate);
  return dates.map((date, i) => ({
    id:         nanoid(),
    day:        i + 1,
    date,
    title:      `Day ${i + 1}`,
    activities: [],
  }));
}

/** A first draft built from the trip's own destinations if there's enough to
 *  work with; blank day shells (the old behaviour) otherwise. */
function buildInitialDays(
  plan: TripPlan, destinations: Destination[],
  attractions: TouristAttraction[], treks: Trek[]
): TripDay[] {
  if (plan.itinerary && plan.itinerary.length > 0) return plan.itinerary;
  const suggested = buildSuggestedItinerary(plan, destinations, { attractions, treks });
  return suggested.length > 0 ? suggested : blankDaysFromRange(plan);
}

export function ItineraryBuilder({ plan, destinations, attractions, treks, onChange }: Props) {
  const [days, setDays]             = useState<TripDay[]>(() => buildInitialDays(plan, destinations, attractions, treks));
  const [expanded, setExpanded]     = useState<Set<string>>(() => new Set(days.slice(0, 3).map((d) => d.id)));
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [addingTo, setAddingTo]     = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pushDays = (next: TripDay[]) => {
    setDays(next);
    onChange(next);
  };

  // A freshly-generated suggestion only exists in this component's local
  // state until something calls onChange — push it up once on mount so it's
  // actually saved (autosave picks it up 3s later) instead of silently
  // vanishing if the traveller never touches this tab.
  const pushedInitialSuggestion = useRef(false);
  useEffect(() => {
    if (pushedInitialSuggestion.current) return;
    pushedInitialSuggestion.current = true;
    if ((!plan.itinerary || plan.itinerary.length === 0) && days.some((d) => d.activities.length > 0)) {
      onChange(days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerateSuggestions = () => {
    const suggested = buildSuggestedItinerary(plan, destinations, { attractions, treks });
    if (suggested.length > 0) pushDays(suggested);
  };

  const allExpanded  = days.every((d) => expanded.has(d.id));
  const toggleAll    = () =>
    allExpanded
      ? setExpanded(new Set())
      : setExpanded(new Set(days.map((d) => d.id)));

  const toggleDay = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const updateDayTitle = (id: string, title: string) =>
    pushDays(days.map((d) => (d.id === id ? { ...d, title } : d)));

  const addDay = () => {
    const last = days[days.length - 1];
    let date = "";
    if (last?.date) {
      const d = new Date(last.date + "T12:00:00");
      d.setDate(d.getDate() + 1);
      date = d.toISOString().slice(0, 10);
    }
    const next: TripDay = {
      id:         nanoid(),
      day:        (last?.day ?? 0) + 1,
      date,
      title:      `Day ${(last?.day ?? 0) + 1}`,
      activities: [],
    };
    pushDays([...days, next]);
    setExpanded((s) => new Set([...s, next.id]));
  };

  const removeDay = (id: string) =>
    pushDays(
      days.filter((d) => d.id !== id).map((d, i) => ({ ...d, day: i + 1 }))
    );

  const reorderDays = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = days.findIndex((d) => d.id === active.id);
    const newIndex = days.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    pushDays(arrayMove(days, oldIndex, newIndex).map((d, i) => ({ ...d, day: i + 1 })));
  };

  const reorderActivities = (dayId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    pushDays(
      days.map((d) => {
        if (d.id !== dayId) return d;
        const oldIndex = d.activities.findIndex((a) => a.id === active.id);
        const newIndex = d.activities.findIndex((a) => a.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return d;
        return { ...d, activities: arrayMove(d.activities, oldIndex, newIndex) };
      })
    );
  };

  const addActivity = (dayId: string, seed?: Partial<TripActivity>) => {
    const act: TripActivity = {
      id:            nanoid(),
      time:          "",
      title:         "",
      type:          "custom",
      destinationId: "",
      notes:         "",
      ...seed,
    };
    pushDays(days.map((d) => d.id === dayId ? { ...d, activities: [...d.activities, act] } : d));
    setExpanded((s) => new Set([...s, dayId]));
    setAddingTo(null);
  };

  const updateActivity = (dayId: string, actId: string, patch: Partial<TripActivity>) =>
    pushDays(
      days.map((d) =>
        d.id === dayId
          ? { ...d, activities: d.activities.map((a) => (a.id === actId ? { ...a, ...patch } : a)) }
          : d
      )
    );

  const removeActivity = (dayId: string, actId: string) =>
    pushDays(
      days.map((d) =>
        d.id === dayId ? { ...d, activities: d.activities.filter((a) => a.id !== actId) } : d
      )
    );

  // Everything picked in the district-discovery step that isn't already
  // placed as an activity anywhere in the itinerary — the auto-suggestion
  // seeds one per day, but the rest need a home too.
  const placedIds = useMemo(() => {
    const s = new Set<string>();
    for (const d of days) for (const a of d.activities) s.add(`${a.type}:${a.destinationId}`);
    return s;
  }, [days]);

  const unassigned = useMemo(() => [
    ...attractions.filter((a) => !placedIds.has(`attraction:${a.id}`)).map((a) => ({ kind: "attraction" as const, id: a.id, name: a.name })),
    ...treks.filter((t) => !placedIds.has(`trek:${t.id}`)).map((t) => ({ kind: "trek" as const, id: t.id, name: t.name })),
  ], [attractions, treks, placedIds]);

  const canSuggest = plan.destinationIds.length > 0 && dateRange(plan.startDate, plan.endDate).length > 0;

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          {canSuggest
            ? "No days yet — build a suggested itinerary from your destinations, or add days manually."
            : "No days yet. Set trip dates to auto-generate your itinerary, or add days manually."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {canSuggest && (
            <Button variant="accent" size="sm" onClick={regenerateSuggestions}>
              <Sparkles size={14} /> Auto-fill itinerary
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addDay}>
            <Plus size={14} /> Add first day
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {days.length} {days.length === 1 ? "day" : "days"} ·{" "}
          {days.reduce((s, d) => s + d.activities.length, 0)} activities
        </p>
        <div className="flex items-center gap-3">
          {canSuggest && (
            <button
              onClick={regenerateSuggestions}
              title="Replace every day below with a fresh suggestion"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <Sparkles size={13} />
              Regenerate suggestions
            </button>
          )}
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ChevronsUpDown size={13} />
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      {/* Unassigned selections tray */}
      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-dashed border-secondary/40 bg-secondary/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-secondary">
            <Inbox size={14} /> Not yet in your itinerary ({unassigned.length})
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Picked in Discover but not placed on a day yet — add each one to a day below.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unassigned.map((u) => (
              <div key={`${u.kind}-${u.id}`} className="relative">
                <button
                  onClick={() => setAddingTo(addingTo === `${u.kind}-${u.id}` ? null : `${u.kind}-${u.id}`)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-soft transition hover:border-secondary"
                >
                  {u.name} <ChevronDown size={11} />
                </button>
                {addingTo === `${u.kind}-${u.id}` && (
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[160px] overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-card">
                    {days.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => addActivity(d.id, { title: u.name, type: u.kind, destinationId: u.id })}
                        className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                      >
                        {d.title || `Day ${d.day}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderDays}>
        <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {days.map((day) => (
            <SortableDayCard
              key={day.id}
              day={day}
              isExpanded={expanded.has(day.id)}
              isEditing={editingDay === day.id}
              onToggle={() => toggleDay(day.id)}
              onEditTitle={() => setEditingDay(editingDay === day.id ? null : day.id)}
              onTitleChange={(t) => updateDayTitle(day.id, t)}
              onAddActivity={() => addActivity(day.id)}
              onUpdateActivity={(aid, patch) => updateActivity(day.id, aid, patch)}
              onRemoveActivity={(aid) => removeActivity(day.id, aid)}
              onRemoveDay={() => removeDay(day.id)}
              onReorderActivities={reorderActivities(day.id)}
              sensors={sensors}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" onClick={addDay} className="w-full">
        <Plus size={14} /> Add day
      </Button>
    </div>
  );
}

/* ---- SortableDayCard ---- */

interface DayCardProps {
  day: TripDay;
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEditTitle: () => void;
  onTitleChange: (t: string) => void;
  onAddActivity: () => void;
  onUpdateActivity: (id: string, patch: Partial<TripActivity>) => void;
  onRemoveActivity: (id: string) => void;
  onRemoveDay: () => void;
  onReorderActivities: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function SortableDayCard({
  day, isExpanded, isEditing,
  onToggle, onEditTitle, onTitleChange,
  onAddActivity, onUpdateActivity, onRemoveActivity, onRemoveDay,
  onReorderActivities, sensors,
}: DayCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const done  = day.activities.filter((a) => a.title.trim()).length;
  const total = day.activities.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/card rounded-2xl border border-border bg-white shadow-soft overflow-hidden",
        isDragging && "z-10 opacity-90 shadow-card"
      )}
    >
      {/* Day header */}
      <div className="flex items-center gap-2 px-5 py-3.5">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Reorder day: ${day.title || `Day ${day.day}`}`}
          className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition hover:text-foreground group-hover/card:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-600">
          {day.day}
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              autoFocus
              value={day.title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onEditTitle}
              onKeyDown={(e) => e.key === "Enter" && onEditTitle()}
              className="h-7 text-sm font-semibold"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{day.title}</span>
              <button
                onClick={onEditTitle}
                className="text-muted-foreground hover:text-foreground transition opacity-0 group-hover/card:opacity-100"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          {day.date && (
            <p className="text-xs text-muted-foreground">{fmtDay(day.date)}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {done}/{total}
            </span>
          )}
          <button
            onClick={onRemoveDay}
            className="ml-1 rounded-lg p-1 text-muted-foreground opacity-0 group-hover/card:opacity-100 hover:text-destructive hover:bg-destructive/10 transition"
            title="Remove day"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onToggle}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition"
          >
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Activities */}
      {isExpanded && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {day.activities.length === 0 && (
            <p className="text-sm text-muted-foreground">No activities yet — add one below.</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorderActivities}>
            <SortableContext items={day.activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              {day.activities.map((act) => (
                <SortableActivityRow
                  key={act.id}
                  activity={act}
                  onChange={(patch) => onUpdateActivity(act.id, patch)}
                  onRemove={() => onRemoveActivity(act.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button variant="ghost" size="sm" onClick={onAddActivity} className="text-brand-600">
            <Plus size={13} /> Add activity
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---- SortableActivityRow ---- */

interface ActivityRowProps {
  activity: TripActivity;
  onChange: (patch: Partial<TripActivity>) => void;
  onRemove: () => void;
}

function SortableActivityRow({ activity, onChange, onRemove }: ActivityRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const typeConfig = ACTIVITY_TYPES.find((t) => t.value === activity.type) ?? ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];
  // Any edit means the traveller has reviewed this suggestion — stop calling
  // it one, so the badge only ever marks activities nobody has looked at yet.
  const edit = (patch: Partial<TripActivity>) => onChange(activity.suggested ? { ...patch, suggested: false } : patch);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/row flex gap-2 rounded-xl border border-border/60 bg-muted/20 p-3",
        isDragging && "z-10 opacity-90 shadow-card"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder activity: ${activity.title || "Untitled"}`}
        className="mt-1 shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition hover:text-foreground group-hover/row:opacity-100 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-2">
          {activity.suggested && (
            <span
              title="Auto-suggested — edit it to make it yours"
              className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary"
            >
              <Sparkles size={10} /> Suggested
            </span>
          )}
          <input
            value={activity.title}
            onChange={(e) => edit({ title: e.target.value })}
            placeholder="Activity title…"
            className="flex-1 rounded-lg border-0 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
          />
          <select
            value={activity.type}
            onChange={(e) => edit({ type: e.target.value as ActivityType })}
            className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium border-0 outline-none", typeConfig.color)}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            onClick={onRemove}
            className="shrink-0 text-muted-foreground opacity-0 group-hover/row:opacity-100 hover:text-destructive transition"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Meta row: time + location + notes */}
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-white border border-border/60 px-2 py-1">
            <Clock size={11} className="shrink-0 text-muted-foreground" />
            <input
              type="time"
              value={activity.time}
              onChange={(e) => edit({ time: e.target.value })}
              className="w-24 bg-transparent text-xs outline-none text-muted-foreground"
            />
          </div>
          <div className="flex flex-1 items-center gap-1.5 rounded-lg bg-white border border-border/60 px-2 py-1 min-w-[120px]">
            <MapPin size={11} className="shrink-0 text-muted-foreground" />
            <input
              value={activity.location ?? ""}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="Location…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 focus:ring-0"
            />
          </div>
          <input
            value={activity.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Notes…"
            className="flex-1 min-w-[120px] rounded-lg bg-white border border-border/60 px-2 py-1 text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-0"
          />
        </div>
      </div>
    </div>
  );
}
