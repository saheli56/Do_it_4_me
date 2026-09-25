import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProfileVaultManager } from "../src/profile-vault-manager.js";
import fs from "node:fs";
import path from "node:path";

describe("ProfileVaultManager", () => {
  const testDir = path.resolve(process.cwd(), "test-data-profiles");

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should initialize with default profiles", () => {
    const manager = new ProfileVaultManager(testDir);
    const profiles = manager.getAllProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(3);

    const defaultProfile = manager.getDefaultProfile();
    expect(defaultProfile).toBeDefined();
    expect(defaultProfile.isDefault).toBe(true);
    expect(defaultProfile.id).toBe("profile-personal");
  });

  it("should create, update, and retrieve custom profiles", () => {
    const manager = new ProfileVaultManager(testDir);

    const created = manager.createProfile({
      label: "Freelance Agency",
      icon: "briefcase",
      color: "violet",
      firstName: "Alex",
      lastName: "Rivera",
      email: "alex@agency.dev",
      phone: "+91 9999988888",
      address: {
        city: "Bangalore",
        state: "Karnataka",
        country: "India"
      },
      business: {
        companyName: "Rivera Digital",
        taxIdOrGst: "GSTIN29ABCDE1234F1Z5"
      }
    });

    expect(created.id).toMatch(/^profile-/);
    expect(created.label).toBe("Freelance Agency");
    expect(created.business?.companyName).toBe("Rivera Digital");

    const fetched = manager.getProfileById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.email).toBe("alex@agency.dev");

    const updated = manager.updateProfile(created.id, {
      phone: "+91 8888877777",
      notes: "Updated client billing contact"
    });

    expect(updated.phone).toBe("+91 8888877777");
    expect(updated.notes).toBe("Updated client billing contact");
  });

  it("should switch default profiles and delete safely", () => {
    const manager = new ProfileVaultManager(testDir);

    const custom = manager.createProfile({
      label: "Startup LLC",
      firstName: "Mimi",
      lastName: "Das",
      email: "mimi@startup.io"
    });

    manager.setDefaultProfile(custom.id);
    expect(manager.getDefaultProfile().id).toBe(custom.id);

    const deleted = manager.deleteProfile("profile-work");
    expect(deleted).toBe(true);
    expect(manager.getProfileById("profile-work")).toBeUndefined();
  });
});
