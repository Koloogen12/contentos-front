// Mirrors the backend contract in tools/content-os-backend/CONTRACTS.md.

export type UUID = string;

export interface User {
  id: UUID;
  organization_id: UUID;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  created_at: string;
}

export interface MeResponse {
  user: User;
  organization: Organization;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface CanvasOut {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  name: string;
  description: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export type NodeType = "source" | "extract" | "format";
export type NodeStatus = "idle" | "running" | "done" | "error";

export interface NodeOut {
  id: UUID;
  canvas_id: UUID;
  type: NodeType;
  position_x: number;
  position_y: number;
  data: Record<string, unknown>;
  status: NodeStatus;
  created_at: string;
  updated_at: string;
}

export interface EdgeOut {
  id: UUID;
  canvas_id: UUID;
  source_node_id: UUID;
  target_node_id: UUID;
  created_at: string;
}

export interface CanvasDetail extends CanvasOut {
  nodes: NodeOut[];
  edges: EdgeOut[];
}
