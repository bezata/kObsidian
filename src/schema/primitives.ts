import { z } from "zod";

const vaultRelativePathBase = z
  .string()
  .min(1)
  .max(255)
  .transform((value) => value.replaceAll("\\", "/").trim())
  .refine((value) => !value.startsWith("/"), "Path must be vault-relative")
  .refine((value) => !value.includes(".."), "Path must not contain path traversal");

export const notePathSchema = vaultRelativePathBase.refine(
  (value) => value.endsWith(".md") || value.endsWith(".markdown"),
  "Path must point to a markdown note",
);

export const folderPathSchema = vaultRelativePathBase.optional();
export const vaultPathSchema = z.string().min(1);
export const tagSchema = z
  .string()
  .min(1)
  .transform((value) => value.replace(/^#/, "").trim())
  .refine((value) => value.length > 0, "Tag cannot be empty");
export const tagsSchema = z.array(tagSchema).max(50);
export const dateStringSchema = z.iso.date();
export const optionalDateStringSchema = dateStringSchema.optional();
export const positiveIntSchema = z.number().int().min(0);
export const limitSchema = z.number().int().min(1).max(500).default(50);
export const sortDirectionSchema = z.enum(["asc", "desc"]).default("asc");
export const mergeStrategySchema = z.enum(["replace", "append"]).default("replace");
