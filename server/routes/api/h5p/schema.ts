import type formidable from "formidable";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const H5PUploadSchema = BaseSchema.extend({
  body: z.object({
    documentId: z.uuid().optional(),
  }),
  file: z.custom<formidable.File>(),
});

export type H5PUploadReq = z.infer<typeof H5PUploadSchema>;

export const H5PTrackSchema = BaseSchema.extend({
  body: z.object({
    moduleId: z.uuid(),
    moduleTitle: z.string().optional(),
    contentType: z.string().optional().nullable(),
    statement: z.record(z.string(), z.unknown()),
  }),
});

export type H5PTrackReq = z.infer<typeof H5PTrackSchema>;
