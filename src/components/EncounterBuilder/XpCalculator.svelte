<script lang="ts">
  import { encounterBuilderStore } from '../../stores/encounter-builder';
  import { getXpForCr } from '../../utils/xp';

  // Helper to get full monster data
  function getMonsterById(id: string) {
    return $encounterBuilderStore.statBlocks.find((m) => m.id === id);
  }

  // Calculate Base XP (before multipliers)
  let baseXp = $derived(
    $encounterBuilderStore.encounterMonsters.reduce((sum, em) => {
      const monster = getMonsterById(em.id);
      if (!monster) {
        return sum;
      }
      return sum + getXpForCr(monster.challenge_rating) * em.quantity;
    }, 0),
  );

  // Calculate number of monsters
  let numberOfMonsters = $derived(
    $encounterBuilderStore.encounterMonsters.reduce(
      (sum, em) => sum + em.quantity,
      0,
    ),
  );

  // Determine XP multiplier based on number of monsters
  function getXpMultiplier(count: number): number {
    if (count === 1) return 1;
    if (count === 2) return 1.5;
    if (count >= 3 && count <= 6) return 2;
    if (count >= 7 && count <= 10) return 2.5;
    if (count >= 11 && count <= 14) return 3;
    if (count >= 15) return 4;
    return 1;
  }

  let xpMultiplier = $derived(getXpMultiplier(numberOfMonsters));

  // Adjusted XP
  let adjustedXp = $derived(baseXp * xpMultiplier);

  // Calculate Party Thresholds
  function getThreshold(
    level: number,
    difficulty: 'easy' | 'medium' | 'hard' | 'deadly',
  ): number {
    const thresholds: Record<
      number,
      { easy: number; medium: number; hard: number; deadly: number }
    > = {
      1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
      2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
      3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
      4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
      5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
      6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
      7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
      8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
      9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
      10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
      11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
      12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
      13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
      14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
      15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
      16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
      17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
      18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
      19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
      20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
    };

    return thresholds[level]?.[difficulty] ?? 0;
  }

  // Party Levels
  let partyLevels = $derived(
    $encounterBuilderStore.currentParty.map(
      (member) => member.overrideLevel ?? member.level,
    ),
  );

  // Thresholds
  let easyThreshold = $derived(
    partyLevels.reduce((sum, lvl) => sum + getThreshold(lvl, 'easy'), 0),
  );
  let mediumThreshold = $derived(
    partyLevels.reduce((sum, lvl) => sum + getThreshold(lvl, 'medium'), 0),
  );
  let hardThreshold = $derived(
    partyLevels.reduce((sum, lvl) => sum + getThreshold(lvl, 'hard'), 0),
  );
  let deadlyThreshold = $derived(
    partyLevels.reduce((sum, lvl) => sum + getThreshold(lvl, 'deadly'), 0),
  );

  // Determine Difficulty
  function determineDifficulty(
    adjustedXp: number,
    thresholds: { easy: number; medium: number; hard: number; deadly: number },
  ): string {
    if (adjustedXp < thresholds.easy) return 'Trivial';
    if (adjustedXp < thresholds.medium) return 'Easy';
    if (adjustedXp < thresholds.hard) return 'Medium';
    if (adjustedXp < thresholds.deadly) return 'Hard';
    return 'Deadly';
  }
  let encounterDifficulty = $derived(
    determineDifficulty(adjustedXp, {
      easy: easyThreshold,
      medium: mediumThreshold,
      hard: hardThreshold,
      deadly: deadlyThreshold,
    }),
  );
</script>

<div class="box">
  <h3 class="subtitle is-5">Encounter XP Summary</h3>

  <p><strong>Base XP:</strong> {baseXp}</p>
  <p><strong>XP Multiplier:</strong> {xpMultiplier}×</p>
  <p><strong>Adjusted XP:</strong> {adjustedXp}</p>

  <br />

  <h3 class="subtitle is-6">Party Difficulty Thresholds</h3>
  <p><strong>Easy:</strong> {easyThreshold} XP</p>
  <p><strong>Medium:</strong> {mediumThreshold} XP</p>
  <p><strong>Hard:</strong> {hardThreshold} XP</p>
  <p><strong>Deadly:</strong> {deadlyThreshold} XP</p>

  <br />

  <div class="notification is-primary">
    <strong>Encounter Difficulty:</strong>
    {encounterDifficulty}
  </div>
</div>
