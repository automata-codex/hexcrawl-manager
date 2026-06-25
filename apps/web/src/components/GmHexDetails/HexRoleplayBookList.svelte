<script lang="ts">
  import { sortIgnoringArticles } from '@achm/core';

  import { getRoleplayBookPath } from '../../config/routes.ts';

  import type { RoleplayBookMapEntry } from '../../types.ts';

  interface Props {
    /** Book slugs reminded at this hex feature. */
    roleplayBooks?: string[];
    roleplayBookMap?: Record<string, RoleplayBookMapEntry>;
  }

  const { roleplayBooks, roleplayBookMap = {} }: Props = $props();

  const resolved = $derived(
    (roleplayBooks ?? [])
      .map((id) => ({
        id,
        name: roleplayBookMap?.[id]?.name ?? id,
        found: !!roleplayBookMap?.[id],
      }))
      .sort((a, b) => sortIgnoringArticles(a.name, b.name)),
  );
</script>

{#if resolved.length > 0}
  <p>
    <strong>Roleplay books:</strong>
    {#each resolved as book, i (book.id)}
      {#if book.found}
        <a href={getRoleplayBookPath(book.id)}>{book.name}</a>
      {:else}
        <span class="has-text-danger">{book.name} (not found)</span>
      {/if}{#if i < resolved.length - 1},{' '}{/if}
    {/each}
  </p>
{/if}
