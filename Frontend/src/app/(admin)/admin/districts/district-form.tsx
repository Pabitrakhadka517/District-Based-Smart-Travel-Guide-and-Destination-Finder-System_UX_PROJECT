"use client";
import { useState } from "react";
import type { District } from "@/types";
import { EntityFormModal } from "@/components/dashboard/entity-form-modal";
import { Field, TagsInput, CoordinatesFields } from "@/components/dashboard/form-fields";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminEntityService } from "@/services/adminEntityService";
import { uploadService } from "@/services/uploadService";
import { slugify } from "@/lib/utils";

interface DistrictFormProps {
  district: District | null;
  onClose: () => void;
  onSaved: (district: District) => void;
}

export function DistrictForm({ district, onClose, onSaved }: DistrictFormProps) {
  const isEdit = !!district;
  const [name, setName] = useState(district?.name ?? "");
  const [slug, setSlug] = useState(district?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [province, setProvince] = useState(district?.province ?? "");
  const [description, setDescription] = useState(district?.description ?? "");
  const [heroImage, setHeroImage] = useState(district?.heroImage ?? null);
  const [coordinates, setCoordinates] = useState(district?.coordinates ?? { lat: 0, lng: 0 });
  const [popularFor, setPopularFor] = useState<string[]>(district?.popularFor ?? []);
  const [bestSeason, setBestSeason] = useState(district?.bestSeason ?? "");
  const [rating, setRating] = useState(district?.rating ?? 0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim() || !province.trim()) {
      setError("Name, slug and province are required.");
      return;
    }
    if (!heroImage?.url) {
      setError("Please upload a hero image.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(), slug: slug.trim(), province: province.trim(),
        description, heroImage, coordinates, popularFor, bestSeason, rating,
      };
      const saved = isEdit
        ? await adminEntityService.update<District>("districts", district!.id, body)
        : await adminEntityService.create<District>("districts", body);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save district");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    uploadService.discardUnsavedImages([district?.heroImage], [heroImage]);
    onClose();
  };

  return (
    <EntityFormModal
      title={isEdit ? `Edit ${district!.name}` : "Add district"}
      onClose={cancel}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <ImageUploader
        type="district"
        value={heroImage}
        onChange={setHeroImage}
        alt={name}
        label="Hero image"
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Slug" required>
          <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Province" required>
          <Input value={province} onChange={(e) => setProvince(e.target.value)} />
        </Field>
        <Field label="Best season">
          <Input value={bestSeason} onChange={(e) => setBestSeason(e.target.value)} placeholder="e.g. Autumn" />
        </Field>
      </div>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>

      <Field label="Popular for">
        <TagsInput value={popularFor} onChange={setPopularFor} placeholder="Trekking, Culture, Nature" />
      </Field>

      <CoordinatesFields value={coordinates} onChange={setCoordinates} />

      <Field label="Rating">
        <Input type="number" min={0} max={5} step={0.1} value={rating} onChange={(e) => setRating(Number(e.target.value))} />
      </Field>
    </EntityFormModal>
  );
}
