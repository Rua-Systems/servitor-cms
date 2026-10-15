<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		CARD_LONG_TEXT_MAX_LENGTH,
		CARD_TEXT_MAX_LENGTH,
		CARD_URL_MAX_LENGTH
	} from '$lib/constants/cards';
	import { m } from '$lib/paraglide/messages';
	import type { CardValueInputProps } from './card-value-input.interfaces';

	const SELECT_CLASS =
		'h-9 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm';

	let {
		field,
		id,
		value,
		name,
		disabled = false,
		onInput,
		onBlur
	}: CardValueInputProps = $props();

	const label = $derived.by(() => {
		if (field.kind === 'price' && field.currency !== null) {
			return `${field.label} (${field.currency})`;
		}

		return field.label;
	});

	const minimum = $derived.by(() => {
		if (field.kind === 'price') {
			return 0;
		}

		return undefined;
	});

	function changed(event: Event): void {
		const target = event.currentTarget;

		if (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement
		) {
			onInput?.(target.value);
		}
	}
</script>

{#if field.kind === 'boolean'}
	<label class="flex items-center gap-2 text-sm">
		<input
			{id}
			{name}
			type="checkbox"
			checked={value === 'true'}
			{disabled}
			class="size-4 accent-primary"
		/>
		<span class="font-medium">{label}</span>
		{#if field.required}
			<span class="text-destructive" aria-hidden="true">*</span>
		{/if}
	</label>
{:else}
	<div class="grid gap-2">
		<Label for={id}>
			{label}
			{#if field.required}
				<span class="text-destructive" aria-hidden="true">*</span>
			{/if}
		</Label>
		{#if field.kind === 'long_text'}
			<Textarea
				{id}
				{name}
				{value}
				{disabled}
				rows={4}
				maxlength={CARD_LONG_TEXT_MAX_LENGTH}
				required={field.required}
				oninput={changed}
				onblur={onBlur}
			/>
		{:else if field.kind === 'select'}
			<select {id} {name} {disabled} class={SELECT_CLASS} onchange={changed}>
				<option value="" selected={value === ''} class="bg-popover text-popover-foreground">
					{m.cards_choice_none()}
				</option>
				{#each field.options as option (option)}
					<option
						value={option}
						selected={option === value}
						class="bg-popover text-popover-foreground"
					>
						{option}
					</option>
				{/each}
			</select>
		{:else if field.kind === 'number' || field.kind === 'price'}
			<Input
				{id}
				{name}
				{value}
				{disabled}
				type="number"
				step="any"
				min={minimum}
				oninput={changed}
				onblur={onBlur}
			/>
		{:else if field.kind === 'url'}
			<Input
				{id}
				{name}
				{value}
				{disabled}
				type="url"
				maxlength={CARD_URL_MAX_LENGTH}
				placeholder="https://"
				oninput={changed}
				onblur={onBlur}
			/>
		{:else if field.kind === 'date'}
			<Input {id} {name} {value} {disabled} type="date" oninput={changed} onblur={onBlur} />
		{:else}
			<Input
				{id}
				{name}
				{value}
				{disabled}
				maxlength={CARD_TEXT_MAX_LENGTH}
				oninput={changed}
				onblur={onBlur}
			/>
		{/if}
	</div>
{/if}
