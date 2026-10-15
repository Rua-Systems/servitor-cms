<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import FormattedDate from '$lib/components/formatted-date.svelte';
	import NativeSelect from '$lib/components/native-select.svelte';
	import Pager from '$lib/components/pager.svelte';
	import TranslationStatusBadge from '$lib/components/posts/translation-status-badge.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { languageLabel, postErrorMessage, postTitle } from '$lib/i18n/post-messages';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const languageOptions = $derived(
		data.languages
			.filter((language) => language.enabled)
			.map((language) => ({
				value: language.code,
				label: `${language.nativeName} (${language.code})`
			}))
	);

	const typeOptions = $derived(
		data.cardTypes.map((cardType) => ({ value: cardType.id, label: cardType.name }))
	);

	const errorMessage = $derived.by(() => {
		if (!form || !('error' in form)) {
			return null;
		}

		return postErrorMessage(form.error);
	});

	const scopeParams = $derived.by((): Record<string, string> => {
		if (data.showAll) {
			return { scope: 'all' };
		}

		return {};
	});
</script>

<svelte:head>
	<title>{m.cards_title()} · {m.app_name()}</title>
</svelte:head>
<section class="grid gap-6">
	<div class="grid gap-1">
		<h1 class="text-2xl font-semibold">{m.cards_title()}</h1>
		<p class="text-muted-foreground">{m.cards_description()}</p>
	</div>
	<Card.Root>
		<Card.Content>
			{#if data.cardTypes.length === 0}
				<p class="text-sm text-muted-foreground">
					{m.cards_no_types()}
					{#if data.canManageTypes}
						<a href={resolve('/panel/card-types')} class="underline underline-offset-4">
							{m.cards_create_type()}
						</a>
					{/if}
				</p>
			{:else}
				<form method="POST" action="?/create" class="flex flex-wrap items-end gap-3">
					<div class="grid min-w-56 gap-2">
						<Label for="new-card-type">{m.cards_new_type()}</Label>
						<NativeSelect
							id="new-card-type"
							name="cardTypeId"
							options={typeOptions}
							required
						/>
					</div>
					<div class="grid min-w-56 gap-2">
						<Label for="new-card-language">{m.posts_new_language()}</Label>
						<NativeSelect
							id="new-card-language"
							name="languageCode"
							options={languageOptions}
							value={data.defaultLanguage ?? ''}
							required
						/>
					</div>
					<Button type="submit">
						<Plus />
						{m.cards_new()}
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
	{#if errorMessage !== null}
		<Alert.Root variant="destructive">
			<Alert.Description>{errorMessage}</Alert.Description>
		</Alert.Root>
	{/if}
	{#if data.canListAll}
		<nav class="flex gap-2" aria-label={m.cards_scope()}>
			<Button
				href={resolve('/panel/cards')}
				variant="outline"
				size="sm"
				class={cn(!data.showAll && 'bg-muted')}
				aria-current={!data.showAll}
			>
				{m.cards_scope_mine()}
			</Button>
			<form method="GET">
				<Button
					type="submit"
					name="scope"
					value="all"
					variant="outline"
					size="sm"
					class={cn(data.showAll && 'bg-muted')}
					aria-current={data.showAll}
				>
					{m.cards_scope_all()}
				</Button>
			</form>
		</nav>
	{/if}
	{#if data.cards.items.length === 0}
		<p class="text-sm text-muted-foreground">{m.cards_empty()}</p>
	{:else}
		<ul class="grid gap-3" data-testid="card-list">
			{#each data.cards.items as card (card.id)}
				<li class="grid gap-3 rounded-2xl border bg-card p-4">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<a
							href={resolve(`/panel/posts/${card.id}`)}
							class="text-base font-semibold underline-offset-4 hover:underline"
						>
							{postTitle(card.translations[0]?.title ?? '')}
						</a>
						<span class="text-xs text-muted-foreground">
							<FormattedDate value={card.updatedAt} />
						</span>
					</div>
					<p class="text-xs text-muted-foreground">
						{card.cardTypeName}
						{#if !card.own}
							· {m.posts_owner({ name: card.ownerName })}
						{/if}
					</p>
					<ul class="flex flex-wrap gap-2">
						{#each card.translations as translation (translation.id)}
							<li
								class="flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
							>
								<span class="font-medium">
									{languageLabel(data.languages, translation.languageCode)}
								</span>
								<TranslationStatusBadge
									status={translation.status}
									pendingChanges={translation.hasPendingChanges}
								/>
							</li>
						{/each}
					</ul>
					{#if card.hiddenByModerator}
						<p class="text-xs text-destructive">{m.posts_hidden()}</p>
					{/if}
				</li>
			{/each}
		</ul>
		<Pager
			page={data.cards.page}
			pageCount={data.cards.pageCount}
			label={m.cards_title()}
			params={scopeParams}
		/>
	{/if}
</section>
