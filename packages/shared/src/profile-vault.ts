import { z } from "zod";

export const ProfileIconTypeSchema = z.enum([
  "user",
  "briefcase",
  "house",
  "sparkle",
  "buildings",
  "credit-card",
  "tag"
]);
export type ProfileIconType = z.infer<typeof ProfileIconTypeSchema>;

export const ProfileColorSchema = z.enum([
  "indigo",
  "emerald",
  "amber",
  "violet",
  "rose",
  "blue",
  "cyan",
  "fuchsia",
  "teal",
  "orange"
]);
export type ProfileColor = z.infer<typeof ProfileColorSchema>;

export const AppAccentColorSchema = z.enum([
  "indigo",
  "mint",
  "cherry",
  "amber",
  "cyan",
  "violet",
  "sapphire",
  "magenta",
  "emerald",
  "coral",
  "lavender",
  "teal",
  "peach_fuzz",
  "lime",
  "ocean",
  "flame",
  "aurora",
  "gold"
]);
export type AppAccentColor = z.infer<typeof AppAccentColorSchema>;

export const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});
export type Address = z.infer<typeof AddressSchema>;

export const BusinessInfoSchema = z.object({
  companyName: z.string().optional(),
  taxIdOrGst: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional()
});
export type BusinessInfo = z.infer<typeof BusinessInfoSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  isDefault: z.boolean().default(false),
  icon: ProfileIconTypeSchema.default("user"),
  color: ProfileColorSchema.default("indigo"),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  address: AddressSchema.optional().default({}),
  business: BusinessInfoSchema.optional().default({}),
  customAttributes: z.record(z.string()).optional().default({}),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const CreateUserProfileSchema = z.object({
  label: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
  icon: ProfileIconTypeSchema.optional().default("user"),
  color: ProfileColorSchema.optional().default("indigo"),
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  address: AddressSchema.optional().default({}),
  business: BusinessInfoSchema.optional().default({}),
  customAttributes: z.record(z.string()).optional().default({}),
  notes: z.string().optional()
});
export type CreateUserProfile = z.infer<typeof CreateUserProfileSchema>;

export const UpdateUserProfileSchema = z.object({
  label: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  icon: ProfileIconTypeSchema.optional(),
  color: ProfileColorSchema.optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: AddressSchema.optional(),
  business: BusinessInfoSchema.optional(),
  customAttributes: z.record(z.string()).optional(),
  notes: z.string().optional().nullable()
});
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;
