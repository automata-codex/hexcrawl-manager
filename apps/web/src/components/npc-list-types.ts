export interface NpcListItem {
  id: string;
  href: string;
  displayName: string;
  sortKey: string;
  occupation: string;
  image?: string;
  factions: string[];
  plotlines: string[];
  visibility: 'player' | 'gm';
  campaignStatus: 'active' | 'inactive';
}
