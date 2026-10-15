<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		CARD_FIELD_KINDS,
		CARD_FIELD_LABEL_MAX_LENGTH,
		MAX_CARD_FIELDS,
		TRANSLATABLE_CARD_FIELD_KINDS
	} from '$lib/constants/cards';
	import { cardFieldKindLabel } from '$lib/i18n/card-messages';
	import { m } from '$lib/paraglide/messages';
	import type { CardFieldBuilderProps, CardFieldRow } from './card-field-builder.interfaces';
	import { emptyRow, fieldFromRow, keyFromLabel, moveRow, rowFromField } from './card-field-rows';

	const SELECT_CLASS =
		'h-9 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

	let { fields }: CardFieldBuilderProps = $props();

	let rows: CardFieldRow[] = $state(untrack(() => fields.map(rowFromField)));

	const serialized = $derived(JSON.stringify(rows.map(fieldFromRow)));

	function addField(): void {
		rows = [...rows, emptyRow()];
	}

	function removeField(id: string): void {
		rows = rows.filter((row) => row.id !== id);
	}

	function move(id: string, offset: number): void {
		rows = moveRow(rows, id, offset);
	}

	function labelChanged(row: CardFieldRow): void {
		if (!row.keyEdited) {
			row.key = keyFromLabel(row.label);
		}
	}

	function keyChanged(row: CardFieldRow): void {
		row.keyEdited = row.key !== '';
	}

	function translatableKind(row: CardFieldRow): boolean {
		return TRANSLATABLE_CARD_FIELD_KINDS.includes(row.kind);
	}
</script>

<div class="grid gap-4">
	<input type="hidden" name="fields" value={serialized} />
	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">{m.card_types_no_fields()}</p>
	{:else}
		<ol class="grid gap-3" data-testid="card-field-list">
			{#each rows as row, index (row.id)}
				<li class="grid gap-4 rounded-2xl border p-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="grid gap-2">
							<Label for={`field-${row.id}-label`}>{m.card_field_label()}</Label>
							<Input
								id={`field-${row.id}-label`}
								bind:value={row.label}
								maxlength={CARD_FIELD_LABEL_MAX_LENGTH}
								oninput={() => labelChanged(row)}
							/>
						</div>
						<div class="grid gap-2">
							<Label for={`field-${row.id}-key`}>{m.card_field_key()}</Label>
							<Input
								id={`field-${row.id}-key`}
								bind:value={row.key}
								maxlength={40}
								class="font-mono"
								oninput={() => keyChanged(row)}
							/>
						</div>
						<div class="grid gap-2">
							<Label for={`field-${row.id}-kind`}>{m.card_field_kind()}</Label>
							<select
								id={`field-${row.id}-kind`}
								bind:value={row.kind}
								class={SELECT_CLASS}
							>
								{#each CARD_FIELD_KINDS as kind (kind)}
									<option value={kind} class="bg-popover text-popover-foreground">
										{cardFieldKindLabel(kind)}
									</option>
								{/each}
							</select>
						</div>
						{#if row.kind === 'price'}
							<div class="grid gap-2">
								<Label for={`field-${row.id}-currency`}
									>{m.card_field_currency()}</Label
								>
								<Input
									id={`field-${row.id}-currency`}
									bind:value={row.currency}
									maxlength={3}
									class="font-mono uppercase"
								/>
							</div>
						{/if}
						{#if row.kind === 'select'}
							<div class="grid gap-2 sm:col-span-2">
								<Label for={`field-${row.id}-options`}
									>{m.card_field_options()}</Label
								>
								<Textarea
									id={`field-${row.id}-options`}
									bind:value={row.optionsText}
									rows={3}
								/>
								<p class="text-xs text-muted-foreground">
									{m.card_field_options_hint()}
								</p>
							</div>
						{/if}
					</div>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div class="flex flex-wrap gap-4 text-sm">
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									bind:checked={row.required}
									class="size-4 accent-primary"
								/>
								{m.card_field_required()}
							</label>
							{#if translatableKind(row)}
								<label class="flex items-center gap-2">
									<input
										type="checkbox"
										bind:checked={row.translatable}
										class="size-4 accent-primary"
									/>
									{m.card_field_translatable()}
								</label>
							{/if}
						</div>
						<div class="flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label={m.card_field_move_up()}
								disabled={index === 0}
								onclick={() => move(row.id, -1)}
							>
								<ArrowUp />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label={m.card_field_move_down()}
								disabled={index === rows.length - 1}
								onclick={() => move(row.id, 1)}
							>
								<ArrowDown />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label={m.card_field_remove()}
								onclick={() => removeField(row.id)}
							>
								<Trash2 />
							</Button>
						</div>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
	<div>
		<Button
			type="button"
			variant="outline"
			disabled={rows.length >= MAX_CARD_FIELDS}
			onclick={addField}
		>
			<Plus />
			{m.card_types_add_field()}
		</Button>
	</div>
</div>
