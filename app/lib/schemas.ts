import { z } from "zod";

// Small shared input schemas
export const idStringSchema = z.string().min(1);
export const idObjectSchema = z.object({ id: idStringSchema });

export type IdString = z.infer<typeof idStringSchema>;
export type IdObject = z.infer<typeof idObjectSchema>;

// Date schema that accepts either a Date instance or an ISO string and normalizes to Date
export const DateOrStringSchema = z.preprocess((arg) => {
  if (typeof arg === "string") return new Date(arg);
  if (arg instanceof Date) return arg;
  return arg;
}, z.date());
