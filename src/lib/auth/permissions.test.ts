import { describe, it, expect } from "vitest";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

const ALL_PERMISSIONS: Permission[] = [
  "cities:read",
  "cities:manage",
  "patients:read",
  "patients:write",
  "patients:delete",
  "appointments:read",
  "appointments:create",
  "appointments:write",
  "appointments:delete",
  "sessions:read",
  "sessions:write",
  "sessions:delete",
  "catalog:manage",
  "sales:read",
  "sales:write",
  "sales:delete",
  "users:read",
  "users:manage",
];

describe("Permissions", () => {
  describe("gestora", () => {
    it("should have every permission", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission("gestora", permission)).toBe(true);
      }
    });

    it("should have full control over patients", () => {
      expect(hasPermission("gestora", "patients:read")).toBe(true);
      expect(hasPermission("gestora", "patients:write")).toBe(true);
      expect(hasPermission("gestora", "patients:delete")).toBe(true);
    });

    it("should have full control over sales", () => {
      expect(hasPermission("gestora", "sales:read")).toBe(true);
      expect(hasPermission("gestora", "sales:write")).toBe(true);
      expect(hasPermission("gestora", "sales:delete")).toBe(true);
    });
  });

  describe("vendas", () => {
    it("should have moderate patient permissions without delete", () => {
      expect(hasPermission("vendas", "patients:read")).toBe(true);
      expect(hasPermission("vendas", "patients:write")).toBe(true);
      expect(hasPermission("vendas", "patients:delete")).toBe(false);
    });

    it("should have appointment access", () => {
      expect(hasPermission("vendas", "appointments:read")).toBe(true);
      expect(hasPermission("vendas", "appointments:create")).toBe(true);
      expect(hasPermission("vendas", "appointments:write")).toBe(true);
      expect(hasPermission("vendas", "appointments:delete")).toBe(true);
    });

    it("should have sales write but no delete", () => {
      expect(hasPermission("vendas", "sales:read")).toBe(true);
      expect(hasPermission("vendas", "sales:write")).toBe(true);
      expect(hasPermission("vendas", "sales:delete")).toBe(false);
    });

    it("should have limited session access", () => {
      expect(hasPermission("vendas", "sessions:read")).toBe(true);
      expect(hasPermission("vendas", "sessions:write")).toBe(false);
      expect(hasPermission("vendas", "sessions:delete")).toBe(false);
    });

    it("should not have admin capabilities", () => {
      expect(hasPermission("vendas", "users:read")).toBe(false);
      expect(hasPermission("vendas", "users:manage")).toBe(false);
      expect(hasPermission("vendas", "catalog:manage")).toBe(false);
      expect(hasPermission("vendas", "cities:manage")).toBe(false);
    });
  });

  describe("aplicadora", () => {
    it("should have read-only patient permissions", () => {
      expect(hasPermission("aplicadora", "patients:read")).toBe(true);
      expect(hasPermission("aplicadora", "patients:write")).toBe(false);
      expect(hasPermission("aplicadora", "patients:delete")).toBe(false);
    });

    it("should have limited appointment access without create/delete", () => {
      expect(hasPermission("aplicadora", "appointments:read")).toBe(true);
      expect(hasPermission("aplicadora", "appointments:create")).toBe(false);
      expect(hasPermission("aplicadora", "appointments:write")).toBe(true);
      expect(hasPermission("aplicadora", "appointments:delete")).toBe(false);
    });

    it("should have some session write access", () => {
      expect(hasPermission("aplicadora", "sessions:read")).toBe(true);
      expect(hasPermission("aplicadora", "sessions:write")).toBe(true);
      expect(hasPermission("aplicadora", "sessions:delete")).toBe(false);
    });

    it("should not have admin capabilities", () => {
      expect(hasPermission("aplicadora", "users:read")).toBe(false);
      expect(hasPermission("aplicadora", "users:manage")).toBe(false);
      expect(hasPermission("aplicadora", "catalog:manage")).toBe(false);
    });

    it("should have read-only sales", () => {
      expect(hasPermission("aplicadora", "sales:read")).toBe(true);
      expect(hasPermission("aplicadora", "sales:write")).toBe(false);
      expect(hasPermission("aplicadora", "sales:delete")).toBe(false);
    });
  });

  describe("null / undefined handling", () => {
    it("should deny everything for null roles", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission(null, permission)).toBe(false);
      }
    });

    it("should deny everything for undefined roles", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission(undefined, permission)).toBe(false);
      }
    });
  });

  describe("role hierarchy", () => {
    it("gestora should be a superset of vendas", () => {
      const vendasPermissions = ALL_PERMISSIONS.filter((p) =>
        hasPermission("vendas", p),
      );

      for (const permission of vendasPermissions) {
        expect(hasPermission("gestora", permission)).toBe(true);
      }
    });

    it("gestora should be a superset of aplicadora", () => {
      const aplicadoraPermissions = ALL_PERMISSIONS.filter((p) =>
        hasPermission("aplicadora", p),
      );

      for (const permission of aplicadoraPermissions) {
        expect(hasPermission("gestora", permission)).toBe(true);
      }
    });
  });

  describe("every permission is granted by at least one role", () => {
    it("should have at least one role with each permission", () => {
      for (const permission of ALL_PERMISSIONS) {
        const hasAnyRole =
          hasPermission("gestora", permission) ||
          hasPermission("vendas", permission) ||
          hasPermission("aplicadora", permission);

        expect(hasAnyRole).toBe(true);
      }
    });
  });

  describe("least privilege", () => {
    it("no non-gestora role should manage catalog or users", () => {
      expect(hasPermission("vendas", "users:manage")).toBe(false);
      expect(hasPermission("vendas", "users:read")).toBe(false);
      expect(hasPermission("vendas", "catalog:manage")).toBe(false);
      expect(hasPermission("aplicadora", "users:manage")).toBe(false);
      expect(hasPermission("aplicadora", "users:read")).toBe(false);
      expect(hasPermission("aplicadora", "catalog:manage")).toBe(false);
    });

    it("aplicadora should not create or delete appointments", () => {
      expect(hasPermission("aplicadora", "appointments:create")).toBe(false);
      expect(hasPermission("aplicadora", "appointments:delete")).toBe(false);
    });

    it("aplicadora should not delete anything", () => {
      expect(hasPermission("aplicadora", "patients:delete")).toBe(false);
      expect(hasPermission("aplicadora", "sales:delete")).toBe(false);
      expect(hasPermission("aplicadora", "sessions:delete")).toBe(false);
    });
  });
});