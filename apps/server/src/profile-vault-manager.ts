import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  UserProfile,
  CreateUserProfile,
  UpdateUserProfile
} from "@difm/shared";

export class ProfileVaultManager {
  private profiles: Map<string, UserProfile> = new Map();
  private filePath: string;

  constructor(storageDir?: string) {
    const dir = storageDir || path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, "user-profiles.json");
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          this.profiles.clear();
          for (const item of data) {
            this.profiles.set(item.id, item);
          }
          return;
        }
      }
    } catch {
      // Retain or seed defaults
    }

    this.seedDefaults();
  }

  private seedDefaults() {
    this.profiles.clear();

    const personalProfile: UserProfile = {
      id: "profile-personal",
      label: "Personal",
      isDefault: true,
      icon: "user",
      color: "indigo",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India"
      },
      business: {},
      customAttributes: {},
      notes: "Primary personal profile for forms and utilities.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const workProfile: UserProfile = {
      id: "profile-work",
      label: "Work & Business",
      isDefault: false,
      icon: "briefcase",
      color: "blue",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: {
        city: "",
        country: "India"
      },
      business: {
        companyName: "Acme Corp / Freelance",
        department: "Engineering"
      },
      customAttributes: {},
      notes: "Business profile for corporate portals and invoice generation.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const familyProfile: UserProfile = {
      id: "profile-family",
      label: "Family & Household",
      isDefault: false,
      icon: "house",
      color: "emerald",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: {
        city: "",
        country: "India"
      },
      business: {},
      customAttributes: {},
      notes: "Household bills and family utility services.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.profiles.set(personalProfile.id, personalProfile);
    this.profiles.set(workProfile.id, workProfile);
    this.profiles.set(familyProfile.id, familyProfile);
    this.saveToDisk();
  }

  private saveToDisk() {
    try {
      const data = Array.from(this.profiles.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write user profiles to disk:", err);
    }
  }

  getAllProfiles(): UserProfile[] {
    const list = Array.from(this.profiles.values());
    return list.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.createdAt - b.createdAt;
    });
  }

  getProfileById(id: string): UserProfile | undefined {
    return this.profiles.get(id);
  }

  getDefaultProfile(): UserProfile {
    for (const p of this.profiles.values()) {
      if (p.isDefault) return p;
    }
    const first = Array.from(this.profiles.values())[0];
    if (first) {
      first.isDefault = true;
      this.saveToDisk();
      return first;
    }
    this.seedDefaults();
    return this.profiles.get("profile-personal")!;
  }

  createProfile(data: CreateUserProfile): UserProfile {
    const id = `profile-${crypto.randomUUID().slice(0, 8)}`;
    const now = Date.now();

    if (data.isDefault) {
      for (const p of this.profiles.values()) {
        p.isDefault = false;
      }
    }

    const newProfile: UserProfile = {
      id,
      label: data.label.trim(),
      isDefault: data.isDefault || this.profiles.size === 0,
      icon: data.icon || "user",
      color: data.color || "indigo",
      firstName: data.firstName?.trim() || "",
      lastName: data.lastName?.trim() || "",
      email: data.email?.trim() || "",
      phone: data.phone?.trim() || "",
      address: data.address || {},
      business: data.business || {},
      customAttributes: data.customAttributes || {},
      notes: data.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    this.profiles.set(id, newProfile);
    this.saveToDisk();
    return newProfile;
  }

  updateProfile(id: string, updates: UpdateUserProfile): UserProfile {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new Error(`Profile with id ${id} not found`);
    }

    if (updates.isDefault === true) {
      for (const p of this.profiles.values()) {
        p.isDefault = false;
      }
      existing.isDefault = true;
    } else if (updates.isDefault === false && existing.isDefault) {
      existing.isDefault = false;
      // Ensure at least one default exists
      const other = Array.from(this.profiles.values()).find((p) => p.id !== id);
      if (other) other.isDefault = true;
    }

    if (updates.label !== undefined) existing.label = updates.label.trim();
    if (updates.icon !== undefined) existing.icon = updates.icon;
    if (updates.color !== undefined) existing.color = updates.color;
    if (updates.firstName !== undefined) existing.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) existing.lastName = updates.lastName.trim();
    if (updates.email !== undefined) existing.email = updates.email.trim();
    if (updates.phone !== undefined) existing.phone = updates.phone.trim();
    if (updates.address !== undefined) existing.address = { ...existing.address, ...updates.address };
    if (updates.business !== undefined) existing.business = { ...existing.business, ...updates.business };
    if (updates.customAttributes !== undefined) existing.customAttributes = { ...existing.customAttributes, ...updates.customAttributes };
    if (updates.notes !== undefined) existing.notes = updates.notes ? updates.notes.trim() : undefined;

    existing.updatedAt = Date.now();
    this.saveToDisk();
    return existing;
  }

  deleteProfile(id: string): boolean {
    const existing = this.profiles.get(id);
    if (!existing) return false;

    // Do not delete if only 1 profile remains
    if (this.profiles.size <= 1) {
      throw new Error("Cannot delete the only remaining profile");
    }

    const wasDefault = existing.isDefault;
    this.profiles.delete(id);

    if (wasDefault) {
      const first = Array.from(this.profiles.values())[0];
      if (first) first.isDefault = true;
    }

    this.saveToDisk();
    return true;
  }

  setDefaultProfile(id: string): UserProfile {
    const target = this.profiles.get(id);
    if (!target) {
      throw new Error(`Profile ${id} not found`);
    }

    for (const p of this.profiles.values()) {
      p.isDefault = p.id === id;
    }

    target.updatedAt = Date.now();
    this.saveToDisk();
    return target;
  }
}
