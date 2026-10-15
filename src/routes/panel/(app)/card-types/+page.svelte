<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import NativeSelect from '$lib/components/native-select.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CARD_TYPE_KEY_MAX_LENGTH, CARD_TYPE_NAME_MAX_LENGTH } from '$lib/constants/cards';
	import { cardTypeErrorMessage } from '$lib/i18n/card-messages';
	import { m } from '$lib/paraglide/messages';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const presetOptions = [
		{ value: 'product', label: m.card_types_preset_product() },
		{ value: 'blank', label: m.card_types_preset_blank() }
	];

	const errorMessage = $derived.by(() => {
		if (!form || !('error' in form)) {
			return null;
		}

		return cardTypeErrorMessage(form.error);
	});
</script>

<svelte:head>
	<title>{m.card_types_title()} · {m.app_name()}</title>
</svelte:head>
<section class="grid gap-6">
	<div class="grid gap-1">
		<h1 class="text-2xl font-semibold">{m.card_types_title()}</h1>
		<p class="text-muted-foreground">{m.card_types_description()}</p>
	</div>
	<Card.Root>
		<Card.Content>
			{#if data.cardTypes.length === 0}
				<p class="text-sm text-muted-foreground">{m.card_types_empty()}</p>
			{:else}
				<ul class="grid gap-3" data-testid="card-type-list">
					{#each data.cardTypes as cardType (cardType.id)}
						<li
							class="flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4"
						>
							<div class="grid gap-1">
								<a
									href={resolve(`/panel/card-types/${cardType.id}`)}
									class="font-medium underline-offset-4 hover:underline"
								>
									{cardType.name}
								</a>
								<code class="font-mono text-sm text-muted-foreground"
									>{cardType.key}</code
								>
							</div>
							<span class="text-sm text-muted-foreground">
								{m.card_types_field_count({
									count: String(cardType.fields.length)
								})}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Header>
			<Card.Title>
				<h2 class="text-lg font-semibold">{m.card_types_create_title()}</h2>
			</Card.Title>
			<Card.Description>{m.card_types_create_description()}</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-4">
			{#if errorMessage !== null}
				<Alert.Root variant="destructive">
					<Alert.Description>{errorMessage}</Alert.Description>
				</Alert.Root>
			{/if}
			<form method="POST" action="?/create" class="grid gap-4 sm:grid-cols-3" use:enhance>
				<div class="grid gap-2">
					<Label for="new-card-type-name">{m.card_types_name()}</Label>
					<Input
						id="new-card-type-name"
						name="name"
						maxlength={CARD_TYPE_NAME_MAX_LENGTH}
						required
					/>
				</div>
				<div class="grid gap-2">
					<Label for="new-card-type-key">{m.card_types_key()}</Label>
					<Input
						id="new-card-type-key"
						name="key"
						maxlength={CARD_TYPE_KEY_MAX_LENGTH}
						class="font-mono"
					/>
				</div>
				<div class="grid gap-2">
					<Label for="new-card-type-preset">{m.card_types_preset()}</Label>
					<NativeSelect
						id="new-card-type-preset"
						name="preset"
						options={presetOptions}
						value="product"
					/>
				</div>
				<p class="text-xs text-muted-foreground sm:col-span-3">{m.card_types_key_hint()}</p>
				<div class="sm:col-span-3">
					<Button type="submit">{m.card_types_create_submit()}</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</section>
