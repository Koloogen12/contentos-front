import { apiFetch } from "@/lib/api";
import type { BrandContextData, BrandContextOut } from "@/lib/types";

export async function getBrandContext(): Promise<BrandContextOut> {
  return apiFetch<BrandContextOut>("/api/v1/brand-context");
}

export async function updateBrandContext(
  data: BrandContextData,
): Promise<BrandContextOut> {
  return apiFetch<BrandContextOut>("/api/v1/brand-context", {
    method: "PUT",
    body: { data },
  });
}
