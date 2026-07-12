export interface NpcListItem {
  id: string;
  /** Absent for stub rows (e.g. active-agent entries without an `npcId`). */
  href?: string;
  displayName: string;
  sortKey: string;
  occupation: string;
  /** Per-context label that overrides `occupation` as the row's secondary text. */
  role?: string;
  image?: string;
  factions: string[];
  plotlines: string[];
  visibility: 'player' | 'gm';
  campaignStatus: 'active' | 'inactive';
}
