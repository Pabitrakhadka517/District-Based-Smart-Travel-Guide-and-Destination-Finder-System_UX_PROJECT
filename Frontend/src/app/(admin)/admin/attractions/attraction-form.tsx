"use client";
import { useState } from "react";
import type { TouristAttraction, AttractionCategory } from "@/types";
import { EntityFormModal } from "@/components/dashboard/entity-form-modal";
import { Field, TagsInput, CoordinatesFields } from "@/components/dashboard/form-fields";
import { ImageUploader, GalleryUploader } from "@/components/dashboard/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminEntityService } from "@/services/adminEntityService";
import { uploadService } from "@/services/uploadService";
import { useDistricts } from "@/hooks/use-content";
import { slugify } from "@/lib/utils";

const CATEGORIES: AttractionCategory[] = [
  "Religious Sites", "Historical Sites", "Natural Attractions",
  "Lakes & Rivers", "Mountains & Trekking Routes", "Adventure Activities",
  "Cultural Heritage Sites", "Viewpoints", "National Parks & Wildlife",
  "Local Experiences",
];

interface AttractionFormProps {
  attraction: TouristAttraction | null;
  onClose: () => void;
  onSaved: (attraction: TouristAttraction) => void;
}

export function AttractionForm({ attraction, onClose, onSaved }: AttractionFormProps) {
  const isEdit = !!attraction;
  const { data: districts = [] } = useDistricts();

  const [name, setName] = useState(attraction?.name ?? "");
  const [slug, setSlug] = useState(attraction?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [districtId, setDistrictId] = useState(attraction?.districtId ?? "");
  const [category, setCategory] = useState<AttractionCategory>(attraction?.category ?? CATEGORIES[0]);
  const [tagline, setTagline] = useState(attraction?.tagline ?? "");
  const [description, setDescription] = useState(attraction?.description ?? "");
  const [history, setHistory] = useState(attraction?.history ?? "");
  const [heroImage, setHeroImage] = useState(attraction?.heroImage ?? null);
  const [gallery, setGallery] = useState(attraction?.gallery ?? []);
  const [coordinates, setCoordinates] = useState(attraction?.coordinates ?? { lat: 0, lng: 0 });
  const [openingHours, setOpeningHours] = useState(attraction?.openingHours ?? "");
  const [entryFee, setEntryFee] = useState(attraction?.entryFee ?? { nepali: 0, saarc: 0, foreigner: 0, currency: "NPR" });
  const [bestTimeToVisit, setBestTimeToVisit] = useState<string[]>(attraction?.bestTimeToVisit ?? []);
  const [activities, setActivities] = useState<string[]>(attraction?.activities ?? []);
  const [featured, setFeatured] = useState(attraction?.featured ?? false);
  const [trending, setTrending] = useState(attraction?.trending ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim() || !districtId.trim()) {
      setError("Name, slug and district are required.");
      return;
    }
    if (!heroImage?.url) {
      setError("Please upload a hero image.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(), slug: slug.trim(), districtId, category,
        tagline, description, history, heroImage, gallery, coordinates,
        openingHours, entryFee, bestTimeToVisit, activities, featured, trending,
      };
      const saved = isEdit
        ? await adminEntityService.update<TouristAttraction>("attractions", attraction!.id, body)
        : await adminEntityService.create<TouristAttraction>("attractions", body);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save attraction");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    uploadService.discardUnsavedImages(
      [attraction?.heroImage, attraction?.gallery],
      [heroImage, gallery]
    );
    onClose();
  };

  return (
    <EntityFormModal
      title={isEdit ? `Edit ${attraction!.name}` : "Add attraction"}
      onClose={cancel}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <ImageUploader type="attraction-cover" value={heroImage} onChange={setHeroImage} alt={name} label="Hero image" />
      <GalleryUploader type="attraction-gallery" value={gallery} onChange={setGallery} alt={name} label="Gallery" max={10} />

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
        <Field label="Category" required>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AttractionCategory)}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Tagline">
        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </Field>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>

      <Field label="History">
        <Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={2} />
      </Field>

      <CoordinatesFields value={coordinates} onChange={setCoordinates} />

      <Field label="Opening hours">
        <Input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="e.g. 6:00 AM – 6:00 PM" />
      </Field>

      <div>
        <p className="mb-1 text-xs font-medium text-foreground">Entry fee</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Nepali">
            <Input type="number" value={entryFee.nepali} onChange={(e) => setEntryFee({ ...entryFee, nepali: Number(e.target.value) })} />
          </Field>
          <Field label="SAARC">
            <Input type="number" value={entryFee.saarc} onChange={(e) => setEntryFee({ ...entryFee, saarc: Number(e.target.value) })} />
          </Field>
          <Field label="Foreigner">
            <Input type="number" value={entryFee.foreigner} onChange={(e) => setEntryFee({ ...entryFee, foreigner: Number(e.target.value) })} />
          </Field>
          <Field label="Currency">
            <Input value={entryFee.currency} onChange={(e) => setEntryFee({ ...entryFee, currency: e.target.value })} />
          </Field>
        </div>
      </div>

      <Field label="Best time to visit">
        <TagsInput value={bestTimeToVisit} onChange={setBestTimeToVisit} placeholder="Autumn, Spring" />
      </Field>

      <Field label="Activities">
        <TagsInput value={activities} onChange={setActivities} placeholder="Photography, Hiking" />
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
