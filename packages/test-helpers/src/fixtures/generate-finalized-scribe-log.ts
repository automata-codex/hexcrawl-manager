import { ScribeEvent } from '@skyreach/schemas';

export interface LogOptions {}

export type RecipeName = 'regular-day' | 'season-rollover';

export function generateFinalizedScribeLog(
  recipe: RecipeName,
  options?: LogOptions,
): ScribeEvent[];
export function generateFinalizedScribeLog(options?: LogOptions): ScribeEvent[];
export function generateFinalizedScribeLog(
  recipeOrOptions?: LogOptions | RecipeName,
  maybeOptions?: LogOptions,
): ScribeEvent[] {
  // Normalize args
  let recipe: RecipeName;
  let options: LogOptions;

  if (typeof recipeOrOptions === 'string') {
    // Case: generateFinalizedScribeLog('happyPathTravelDay', { ... })
    recipe = recipeOrOptions as RecipeName;
    options = maybeOptions ?? {};
  } else {
    options = recipeOrOptions ?? {};
    throw new Error('You must specify a recipe name when calling generateFinalizedScribeLog');
  }

  // From here on, you can safely use `recipe` and `options`
  // ...

  return []; // placeholder
}
