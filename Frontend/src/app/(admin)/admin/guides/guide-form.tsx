"use client";
import { useState } from "react";
import type { GuideArticle } from "@/types";
import { EntityFormModal } from "@/components/dashboard/entity-form-modal";
import { Field, TagsInput, CoordinatesFields, DistrictSelect } from "@/components/dashboard/form-fields";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminEntityService } from "@/services/adminEntityService";
import { uploadService } from "@/services/uploadService";
import { useDistricts } from "@/hooks/use-content";
import { slugify } from "@/lib/utils";
import { DEFAULT_AVATAR } from "@/lib/cloudinary";

const CATEGORIES: GuideArticle["category"][] = ["Tips", "Itineraries", "Culture", "Food", "Trekking"];

interface GuideFormProps {
  guide: GuideArticle | null;
  onClose: () => void;
  onSaved: (guide: GuideArticle) => void;
}

export function GuideForm({ guide, onClose, onSaved }: GuideFormProps) {
  const isEdit = !!guide;
  const { data: districts = [] } = useDistricts();
  const [title, setTitle] = useState(guide?.title ?? "");
  const [slug, setSlug] = useState(guide?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(guide?.excerpt ?? "");
  const [category, setCategory] = useState<GuideArticle["category"]>(guide?.category ?? "Tips");
  const [cover, setCover] = useState(guide?.cover ?? null);
  const [author, setAuthor] = useState(guide?.author ?? "");
  const [authorAvatar, setAuthorAvatar] = useState(guide?.authorAvatar ?? null);
  const [date, setDate] = useState(guide?.date ?? new Date().toISOString().slice(0, 10));
  const [readMinutes, setReadMinutes] = useState(guide?.readMinutes ?? 5);
  const [tags, setTags] = useState<string[]>(guide?.tags ?? []);
  const [bodyText, setBodyText] = useState((guide?.body ?? []).join("\n\n"));
  const [featured, setFeatured] = useState(guide?.featured ?? false);
  const [coordinates, setCoordinates] = useState(guide?.coordinates ?? { lat: 0, lng: 0 });
  const [districtId, setDistrictId] = useState(guide?.districtId ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !slug.trim() || !author.trim()) {
      setError("Title, slug and author are required.");
      return;
    }
    if (!cover?.url) {
      setError("Please upload a cover image.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        title: title.trim(), slug: slug.trim(), excerpt, category, cover,
        author: author.trim(), authorAvatar: authorAvatar ?? { url: DEFAULT_AVATAR, publicId: null, alt: "" },
        date, readMinutes, tags,
        body: bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        featured, coordinates,
        districtId: districtId || undefined,
      };
      const saved = isEdit
        ? await adminEntityService.update<GuideArticle>("guides", guide!.id, body)
        : await adminEntityService.create<GuideArticle>("guides", body);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save guide");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    uploadService.discardUnsavedImages(
      [guide?.cover, guide?.authorAvatar],
      [cover, authorAvatar]
    );
    onClose();
  };

  return (
    <EntityFormModal
      title={isEdit ? `Edit ${guide!.title}` : "Add guide"}
      onClose={cancel}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <ImageUploader type="guide-cover" value={cover} onChange={setCover} alt={title} label="Cover image" />

      <Field label="Title" required>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
        />
      </Field>
      <Field label="Slug" required>
        <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
      </Field>

      <Field label="Excerpt">
        <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" required>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as GuideArticle["category"])}
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Read time (minutes)">
          <Input type="number" value={readMinutes} onChange={(e) => setReadMinutes(Number(e.target.value))} />
        </Field>
      </div>

      <Field label="District">
        <DistrictSelect value={districtId} onChange={setDistrictId} districts={districts} allowNone />
      </Field>

      <div className="grid grid-cols-[auto_1fr] items-end gap-3">
        <ImageUploader type="guide-avatar" value={authorAvatar} onChange={setAuthorAvatar} alt={author} label="Author avatar" aspectClassName="aspect-square w-24" />
        <div className="space-y-3">
          <Field label="Author" required>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </div>

      <Field label="Tags">
        <TagsInput value={tags} onChange={setTags} placeholder="Itinerary, Beginner, Kathmandu" />
      </Field>

      <Field label="Body (separate paragraphs with a blank line)">
        <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={8} />
      </Field>

      <CoordinatesFields value={coordinates} onChange={setCoordinates} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-secondary" /> Featured
      </label>
    </EntityFormModal>
  );
}
