"use client";
import { useState } from "react";
import type { Festival, Season } from "@/types";
import { EntityFormModal } from "@/components/dashboard/entity-form-modal";
import { Field, CoordinatesFields, DistrictSelect } from "@/components/dashboard/form-fields";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminEntityService } from "@/services/adminEntityService";
import { uploadService } from "@/services/uploadService";
import { useDistricts } from "@/hooks/use-content";
import { slugify } from "@/lib/utils";

const SEASONS: Season[] = ["Spring", "Summer", "Autumn", "Winter"];
const TYPES: Festival["type"][] = ["Religious", "Cultural", "Harvest", "National"];

interface FestivalFormProps {
  festival: Festival | null;
  onClose: () => void;
  onSaved: (festival: Festival) => void;
}

export function FestivalForm({ festival, onClose, onSaved }: FestivalFormProps) {
  const isEdit = !!festival;
  const { data: districts = [] } = useDistricts();
  const [name, setName] = useState(festival?.name ?? "");
  const [slug, setSlug] = useState(festival?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [month, setMonth] = useState(festival?.month ?? "");
  const [season, setSeason] = useState<Season>(festival?.season ?? "Autumn");
  const [type, setType] = useState<Festival["type"]>(festival?.type ?? "Cultural");
  const [description, setDescription] = useState(festival?.description ?? "");
  const [image, setImage] = useState(festival?.image ?? null);
  const [where, setWhere] = useState(festival?.where ?? "");
  const [districtId, setDistrictId] = useState(festival?.districtId ?? "");
  const [isNationwide, setIsNationwide] = useState(festival?.isNationwide ?? false);
  const [duration, setDuration] = useState(festival?.duration ?? "");
  const [coordinates, setCoordinates] = useState(festival?.coordinates ?? { lat: 0, lng: 0 });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    if (!image?.url) {
      setError("Please upload a banner image.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(), slug: slug.trim(), month, season, type, description, image, where,
        districtId: isNationwide ? undefined : (districtId || undefined),
        isNationwide, duration, coordinates,
      };
      const saved = isEdit
        ? await adminEntityService.update<Festival>("festivals", festival!.id, body)
        : await adminEntityService.create<Festival>("festivals", body);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save festival");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    uploadService.discardUnsavedImages([festival?.image], [image]);
    onClose();
  };

  return (
    <EntityFormModal
      title={isEdit ? `Edit ${festival!.name}` : "Add festival"}
      onClose={cancel}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <ImageUploader type="festival" value={image} onChange={setImage} alt={name} label="Banner image" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
          />
        </Field>
        <Field label="Slug" required>
          <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Month">
          <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="e.g. Sep–Oct" />
        </Field>
        <Field label="Season" required>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as Season)}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Type" required>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Festival["type"])}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Where">
          <Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Nationwide" />
        </Field>
        <Field label="Duration">
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 15 days" />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isNationwide}
          onChange={(e) => { setIsNationwide(e.target.checked); if (e.target.checked) setDistrictId(""); }}
          className="accent-secondary"
        />
        Celebrated nationwide (shown on every district page)
      </label>

      {!isNationwide && (
        <Field label="District">
          <DistrictSelect value={districtId} onChange={setDistrictId} districts={districts} allowNone />
        </Field>
      )}

      <CoordinatesFields value={coordinates} onChange={setCoordinates} />
    </EntityFormModal>
  );
}
