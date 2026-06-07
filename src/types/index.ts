/**
 * Visibility scope for a Brain workspace.
 */
export type BrainVisibility = 'private' | 'invited_only' | 'company';

/**
 * User roles within a specific Brain.
 */
export type BrainRole = 'owner' | 'editor' | 'reader';

/**
 * Status of a Markdown Node.
 */
export type NodeStatus = 'draft' | 'active' | 'needs_review' | 'archived';

/**
 * Types of Templates.
 */
export type TemplateType = 'page' | 'structure';

/**
 * User system profile.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A Brain workspace that contains nested markdown nodes.
 */
export interface Brain {
  id: string;
  name: string;
  description: string | null;
  visibility: BrainVisibility;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Member membership associating a user with a Brain and a specific role.
 */
export interface BrainMember {
  id: string;
  brainId: string;
  userId: string;
  role: BrainRole;
  createdAt: Date;
}

/**
 * Configurable JSON template for nodes.
 */
export interface Template {
  id: string;
  brainId: string;
  name: string;
  description: string | null;
  templateType: TemplateType;
  schemaJson: Record<string, unknown>; // JSON representation of fields and layouts
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A Markdown Node representing a document/page in the nested tree.
 * The core rule is that every tree element is a Node/Page (no rigid separation of folders and docs).
 */
export interface Node {
  id: string;
  brainId: string;
  parentId: string | null;
  templateId: string | null;
  title: string;
  slug: string;
  contentMarkdown: string;
  status: NodeStatus;
  description: string | null;
  category: string | null;
  ownerUserId: string;
  responsibleUserId: string;
  position: number;
  lockedBy: string | null;
  lockedAt: Date | null;
  createdBy: string;
  updatedBy: string;
  reviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Represents a historical version of a Node.
 */
export interface NodeVersion {
  id: string;
  nodeId: string;
  title: string;
  contentMarkdown: string;
  status: NodeStatus;
  savedBy: string;
  changeNote: string | null;
  createdAt: Date;
}

/**
 * Tag metadata for organizing nodes inside a brain.
 */
export interface Tag {
  id: string;
  brainId: string;
  name: string;
  createdAt: Date;
}

/**
 * Join table interface representing the relationship between nodes and tags.
 */
export interface NodeTag {
  nodeId: string;
  tagId: string;
}

/**
 * A Node representing an item in the nested tree hierarchy.
 */
export interface NodeTreeItem extends Omit<Node, 'deletedAt'> {
  children: NodeTreeItem[];
}
