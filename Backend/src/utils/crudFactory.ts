import type { Request, Response } from "express";
import type { Model } from "mongoose";
import { ok, fail } from "./response";
import { asyncHandler } from "./asyncHandler";
import { genId } from "./ids";
import { pick, sanitizeImage, sanitizeGallery } from "./sanitize";
import { cleanupReplacedImages } from "../services/cloudinary.service";

interface CrudOptions {
  /** Whitelisted body fields accepted on create/update. */
  fields: string[];
  /** Prefix used by genId() when the caller doesn't supply their own id. */
  idPrefix: string;
  notFoundMessage: string;
  /** Field names holding a single image object, sanitized via sanitizeImage. */
  imageFields?: string[];
  /** Field names holding an image array, sanitized via sanitizeGallery. */
  galleryFields?: string[];
  /** When true, rejects an update whose new slug collides with another document. */
  checkSlugConflict?: boolean;
  /** Optional cascade hook run after a document is deleted (the now-deleted document is passed in). */
  onDeleted?: (doc: Record<string, unknown>) => Promise<void>;
  /** Optional hook run after a document is created or updated (the resulting document is passed in). */
  onWritten?: (doc: Record<string, unknown>) => Promise<void>;
}

/**
 * Every admin-CRUD controller in this codebase (attractions/cities/
 * destinations/districts/festivals/guides/treks) hand-rolled the same
 * pick → sanitize → write → cleanup-images sequence. Centralizing it here
 * means a fix or field addition only has to happen once — this is the direct
 * fix for the bug class where guides.controller.ts's category enum drifted
 * out of sync with its own schema because every copy had to be updated by hand.
 */
// `Model<any>` is intentional: this factory is a thin internal wrapper shared
// across a dozen unrelated Mongoose models, and Mongoose's Document/Model
// generics don't compose cleanly through a wrapper like this. The actual
// field-level typing is still enforced by each model's own schema.
export function makeAdminCrud(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Model: Model<any>,
  opts: CrudOptions
) {
  const imageFields = opts.imageFields ?? [];
  const galleryFields = opts.galleryFields ?? [];
  const allImageFields = [...imageFields, ...galleryFields];
  const selectClause = allImageFields.join(" ");

  function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    for (const f of imageFields) {
      if (body[f] !== undefined) body[f] = sanitizeImage(body[f]);
    }
    for (const f of galleryFields) {
      if (body[f] !== undefined) body[f] = sanitizeGallery(body[f]);
    }
    return body;
  }

  const create = asyncHandler(async (req: Request, res: Response) => {
    const body = sanitizeBody(pick(req.body as Record<string, unknown>, opts.fields));
    const doc = await Model.create({ ...body, id: (body.id as string) ?? genId(opts.idPrefix) });
    if (opts.onWritten) await opts.onWritten(doc as unknown as Record<string, unknown>);
    ok(res, doc, 201);
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    const body = sanitizeBody(pick(req.body as Record<string, unknown>, opts.fields));

    if (opts.checkSlugConflict && body.slug) {
      const conflict = await Model.findOne({ slug: body.slug, id: { $ne: req.params.id } });
      if (conflict) return fail(res, `Slug "${body.slug as string}" is already used by another document.`, 409);
    }

    const existing = allImageFields.length
      ? await Model.findOne({ id: req.params.id }).select(selectClause)
      : null;

    const doc = await Model.findOneAndUpdate(
      { id: req.params.id },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!doc) return fail(res, opts.notFoundMessage, 404);

    if (existing) {
      const before = allImageFields.map((f) => (existing as unknown as Record<string, unknown>)[f]);
      const after = allImageFields.map((f) => (doc as unknown as Record<string, unknown>)[f]);
      cleanupReplacedImages(before, after);
    }
    if (opts.onWritten) await opts.onWritten(doc as unknown as Record<string, unknown>);
    ok(res, doc);
  });

  const remove = asyncHandler(async (req: Request, res: Response) => {
    const doc = await Model.findOneAndDelete({ id: req.params.id });
    if (!doc) return fail(res, opts.notFoundMessage, 404);

    if (allImageFields.length) {
      const before = allImageFields.map((f) => (doc as unknown as Record<string, unknown>)[f]);
      cleanupReplacedImages(before, []);
    }
    if (opts.onDeleted) await opts.onDeleted(doc as unknown as Record<string, unknown>);
    ok(res, { id: req.params.id, deleted: true });
  });

  return { create, update, remove };
}
