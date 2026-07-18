"use client";
import { useState } from "react";
import type { Destination, Category, Difficulty } from "@/types";
import { EntityFormModal } from "@/components/dashboard/entity-form-modal";
import { Field, TagsInput, CoordinatesFields } from "@/components/dashboard/form-fields";
import { ImageUploader, GalleryUploader } from "@/components/dashboard/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminEntityService } from "@/services/adminEntityService";
import { uploadService } from "@/services/uploadService";
import { useDistricts } from "@/hooks/use-content";
import { slugify } from "@/lib/utils";

const CATEGORIES: Category[] = [
  "Heritage", "Adventure", "Nature", "Trekking",
  "Religious", "Wildlife", "Cultural", "Lake", "City",
];
const DIFFICULTIES: Difficulty[] = ["Easy", "Moderate", "Challenging", "Strenuous"];

interface DestinationFormProps {
  destination: Destination | null;
  onClose: () => void;
  onSaved: (destination: Destination) => void;
}

export function DestinationForm({ destination, onClose, onSaved }: DestinationFormProps) {
  const isEdit = !!destination;
  const { data: districts = [] } = useDistricts();

  const [name, setName] = useState(destination?.name ?? "");
  const [slug, setSlug] = useState(destination?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [cityId, setCityId] = useState(destination?.cityId ?? "");
  const [districtId, setDistrictId] = useState(destination?.districtId ?? "");
  const [tagline, setTagline] = useState(destination?.tagline ?? "");
  const [description, setDescription] = useState(destination?.description ?? "");
  const [category, setCategory] = useState<Category>(destination?.category ?? "Heritage");
  const [tags, setTags] = useState<string[]>(destination?.tags ?? []);
  const [heroImage, setHeroImage] = useState(destination?.heroImage ?? null);
  const [gallery, setGallery] = useState(destination?.gallery ?? []);
  const [coordinates, setCoordinates] = useState(destination?.coordinates ?? { lat: 0, lng: 0 });
  const [budget, setBudget] = useState(destination?.budget ?? { budget: 0, midRange: 0, luxury: 0, currency: "NPR" });
  const [bestTimeToVisit, setBestTimeToVisit] = useState<string[]>(destination?.bestTimeToVisit ?? []);
  const [activities, setActivities] = useState<string[]>(destination?.activities ?? []);
  const [difficulty, setDifficulty] = useState<Difficulty | "">(destination?.difficulty ?? "");
  const [recommendedDuration, setRecommendedDuration] = useState(destination?.recommendedDuration ?? "");
  const [featured, setFeatured] = useState(destination?.featured ?? false);
  const [trending, setTrending] = useState(destination?.trending ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim() || !cityId.trim() || !districtId.trim()) {
      setError("Name, slug, city ID and district are required.");
      return;
    }
    if (!heroImage?.url) {
      setError("Please upload a hero image.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(), slug: slug.trim(), cityId: cityId.trim(), districtId,
        tagline, description, category, tags, heroImage, gallery, coordinates, budget,
        bestTimeToVisit: bestTimeToVisit as Destination["bestTimeToVisit"],
        activities, featured, trending,
        difficulty: difficulty || undefined,
        recommendedDuration,
      };
      const saved = isEdit
        ? await adminEntityService.update<Destination>("destinations", destination!.id, body)
        : await adminEntityService.create<Destination>("destinations", body);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save destination");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    uploadService.discardUnsavedImages(
      [destination?.heroImage, destination?.gallery],
      [heroImage, gallery]
    );
    onClose();
  };

  return (
    <EntityFormModal
      title={isEdit ? `Edit ${destination!.name}` : "Add destination"}
      onClose={cancel}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <ImageUploader type="destination-cover" value={heroImage} onChange={setHeroImage} alt={name} label="Cover image" />
      <GalleryUploader type="destination-gallery" value={gallery} onChange={setGallery} alt={name} label="Gallery" max={10} />

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

      <Field label="Tagline">
        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </Field>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="District" required>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a district…</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="City ID" required>
          <Input value={cityId} onChange={(e) => setCityId(e.target.value)} placeholder="e.g. c1" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" required>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Difficulty">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Not rated</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Tags">
        <TagsInput value={tags} onChange={setTags} placeholder="UNESCO, Palace, Architecture" />
      </Field>

      <Field label="Best time to visit">
        <TagsInput value={bestTimeToVisit} onChange={setBestTimeToVisit} placeholder="Autumn, Spring" />
      </Field>

      <Field label="Activities">
        <TagsInput value={activities} onChange={setActivities} placeholder="Photography, Hiking" />
      </Field>

      <CoordinatesFields value={coordinates} onChange={setCoordinates} />

      <div>
        <p className="mb-1 text-xs font-medium text-foreground">Budget per day</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Budget">
            <Input type="number" value={budget.budget} onChange={(e) => setBudget({ ...budget, budget: Number(e.target.value) })} />
          </Field>
          <Field label="Mid-range">
            <Input type="number" value={budget.midRange} onChange={(e) => setBudget({ ...budget, midRange: Number(e.target.value) })} />
          </Field>
          <Field label="Luxury">
            <Input type="number" value={budget.luxury} onChange={(e) => setBudget({ ...budget, luxury: Number(e.target.value) })} />
          </Field>
          <Field label="Currency">
            <Input value={budget.currency} onChange={(e) => setBudget({ ...budget, currency: e.target.value })} />
          </Field>
        </div>
      </div>

      <Field label="Recommended duration">
        <Input value={recommendedDuration} onChange={(e) => setRecommendedDuration(e.target.value)} placeholder="e.g. 2-3 days" />
      </Field>

      <div className="flex gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-secondary" /> Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="accent-secondary" /> Trending
        </label>
      </div>
    </EntityFormModal>
  );
}
