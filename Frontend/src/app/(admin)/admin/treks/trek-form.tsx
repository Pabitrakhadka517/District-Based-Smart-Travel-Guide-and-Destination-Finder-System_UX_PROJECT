"use client";
import { useState } from "react";
import type { Trek, Difficulty } from "@/types";
import { EntityFormModal } from "@/components/dashboard/entity-form-modal";
import { Field, TagsInput, CoordinatesFields, DistrictMultiSelect } from "@/components/dashboard/form-fields";
import { ImageUploader, GalleryUploader } from "@/components/dashboard/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminEntityService } from "@/services/adminEntityService";
import { uploadService } from "@/services/uploadService";
import { useDistricts } from "@/hooks/use-content";
import { slugify } from "@/lib/utils";

const DIFFICULTIES: Difficulty[] = ["Easy", "Moderate", "Challenging", "Strenuous"];

interface TrekFormProps {
  trek: Trek | null;
  onClose: () => void;
  onSaved: (trek: Trek) => void;
}

export function TrekForm({ trek, onClose, onSaved }: TrekFormProps) {
  const isEdit = !!trek;
  const { data: districts = [] } = useDistricts();
  const [name, setName] = useState(trek?.name ?? "");
  const [slug, setSlug] = useState(trek?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [region, setRegion] = useState(trek?.region ?? "");
  const [districtIds, setDistrictIds] = useState<string[]>(trek?.districtIds ?? []);
  const [tagline, setTagline] = useState(trek?.tagline ?? "");
  const [description, setDescription] = useState(trek?.description ?? "");
  const [heroImage, setHeroImage] = useState(trek?.heroImage ?? null);
  const [gallery, setGallery] = useState(trek?.gallery ?? []);
  const [difficulty, setDifficulty] = useState<Difficulty>(trek?.difficulty ?? "Moderate");
  const [durationDays, setDurationDays] = useState(trek?.durationDays ?? 0);
  const [maxAltitude, setMaxAltitude] = useState(trek?.maxAltitude ?? 0);
  const [distanceKm, setDistanceKm] = useState(trek?.distanceKm ?? 0);
  const [bestSeasons, setBestSeasons] = useState<string[]>(trek?.bestSeasons ?? []);
  const [permits, setPermits] = useState<string[]>(trek?.permits ?? []);
  const [highlights, setHighlights] = useState<string[]>(trek?.highlights ?? []);
  const [coordinates, setCoordinates] = useState(trek?.coordinates ?? { lat: 0, lng: 0 });
  const [rating, setRating] = useState(trek?.rating ?? 0);
  const [priceFrom, setPriceFrom] = useState(trek?.priceFrom ?? 0);
  const [featured, setFeatured] = useState(trek?.featured ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    if (!heroImage?.url) {
      setError("Please upload a hero image.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(), slug: slug.trim(), region, districtIds, tagline, description,
        heroImage, gallery, difficulty, durationDays, maxAltitude, distanceKm,
        bestSeasons: bestSeasons as Trek["bestSeasons"], permits, highlights, coordinates,
        rating, priceFrom, featured,
      };
      const saved = isEdit
        ? await adminEntityService.update<Trek>("treks", trek!.id, body)
        : await adminEntityService.create<Trek>("treks", body);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save trek");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    uploadService.discardUnsavedImages([trek?.heroImage, trek?.gallery], [heroImage, gallery]);
    onClose();
  };

  return (
    <EntityFormModal
      title={isEdit ? `Edit ${trek!.name}` : "Add trek"}
      onClose={cancel}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <ImageUploader type="trek-cover" value={heroImage} onChange={setHeroImage} alt={name} label="Cover image" />
      <GalleryUploader type="trek-gallery" value={gallery} onChange={setGallery} alt={name} label="Gallery" max={10} />

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

      <Field label="Region">
        <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Solukhumbu (Khumbu)" />
      </Field>

      <Field label="Districts (hold Ctrl/Cmd to select multiple)">
        <DistrictMultiSelect value={districtIds} onChange={setDistrictIds} districts={districts} />
      </Field>

      <Field label="Tagline">
        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </Field>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Difficulty" required>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Duration (days)">
          <Input type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Max altitude (m)">
          <Input type="number" value={maxAltitude} onChange={(e) => setMaxAltitude(Number(e.target.value))} />
        </Field>
        <Field label="Distance (km)">
          <Input type="number" value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} />
        </Field>
      </div>

      <Field label="Best seasons">
        <TagsInput value={bestSeasons} onChange={setBestSeasons} placeholder="Autumn, Spring" />
      </Field>

      <Field label="Permits">
        <TagsInput value={permits} onChange={setPermits} placeholder="Sagarmatha National Park Permit" />
      </Field>

      <Field label="Highlights">
        <TagsInput value={highlights} onChange={setHighlights} placeholder="Kala Patthar sunrise, Namche Bazaar" />
      </Field>

      <CoordinatesFields value={coordinates} onChange={setCoordinates} />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Rating">
          <Input type="number" min={0} max={5} step={0.1} value={rating} onChange={(e) => setRating(Number(e.target.value))} />
        </Field>
        <Field label="Price from (NPR)">
          <Input type="number" value={priceFrom} onChange={(e) => setPriceFrom(Number(e.target.value))} />
        </Field>
        <Field label="Featured">
          <label className="flex h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-secondary" /> Featured
          </label>
        </Field>
      </div>
    </EntityFormModal>
  );
}
