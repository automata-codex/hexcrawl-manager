import type { PlotlineBeatStatus } from '@achm/schemas';

export type BeatListItem =
  | {
      found: true;
      slug: string;
      title: string;
      status: PlotlineBeatStatus;
      trigger?: string;
    }
  | {
      found: false;
      slug: string;
    };
