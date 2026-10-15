<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CardFieldBuilder from '$lib/components/cards/card-field-builder.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CARD_TYPE_KEY_MAX_LENGTH, CARD_TYPE_NAME_MAX_LENGTH } from '$lib/constants/cards';
	import { cardTypeErrorMessage } from '$lib/i18n/card-messages';
	import { m } from '$lib/paraglide/messages';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const saved = $derived(
		(form !== null && form !== undefined && 'saved' in form) ||
			page.url.searchParams.has('created')
	);

	const errorMessage = $derived.by(() => {
		if (!form || !('error' in form)) {
			return null;
		}

		return cardTypeErrorMessage(form.error);
	});

	const keepFields: SubmitFunction = () => {
		return async ({ update }) => {
			await update({ reset: false });
		};
	};
</script>

<svelte:head>
	<title>{data.cardType.name} · {m.app_name()}</title>
</svelte:head>
<section class="grid gap-6">
	<div class="grid gap-2">
		<a
			href={resolve('/panel/card-types')}
			class="text-sm text-muted-foreground underline-offset-4 hover:underline"
		>
			{m.card_types_back()}
		</a>
		<h1 class="text-2xl font-semibold">{data.cardType.name}</h1>
	</div>
	{#if saved && errorMessage === null}
		<Alert.Root>
			<Alert.Description>{m.card_types_saved()}</Alert.Description>
		</Alert.Root>
	{/if}
	{#if errorMessage !== null}
		<Alert.Root variant="destructive">
			<Alert.Description>{errorMessage}</Alert.Description>
		</Alert.Root>
	{/if}
	<form method="POST" action="?/update" class="grid gap-6" use:enhance={keepFields}>
		<Card.Root>
			<Card.Content class="grid gap-4 sm:grid-cols-2">
				<div class="grid gap-2">
					<Label for="card-type-name">{m.card_types_name()}</Label>
					<Input
						id="card-type-name"
						name="name"
						value={data.cardType.name}
						maxlength={CARD_TYPE_NAME_MAX_LENGTH}
						required
					/>
				</div>
				<div class="grid gap-2">
					<Label for="card-type-key">{m.card_types_key()}</Label>
					<Input
						id="card-type-key"
						name="key"
						value={data.cardType.key}
						maxlength={CARD_TYPE_KEY_MAX_LENGTH}
						class="font-mono"
						required
					/>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header>
				<Card.Title><h2 class="font-semibold">{m.card_types_fields()}</h2></Card.Title>
				<Card.Description>{m.card_types_fields_description()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<CardFieldBuilder fields={data.cardType.fields} />
			</Card.Content>
		</Card.Root>
		<div>
			<Button type="submit">{m.card_types_save()}</Button>
		</div>
	</form>
	<Card.Root>
		<Card.Header>
			<Card.Title><h2 class="font-semibold">{m.card_types_delete_title()}</h2></Card.Title>
			<Card.Description>{m.card_types_delete_description()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/delete" use:enhance>
				<Button type="submit" variant="destructive">{m.card_types_delete_submit()}</Button>
			</form>
		</Card.Content>
	</Card.Root>
</section>
