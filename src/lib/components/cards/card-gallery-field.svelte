<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import X from '@lucide/svelte/icons/x';
	import { untrack } from 'svelte';
	import type { MediaPreview } from '$lib/components/media/media-field.interfaces';
	import MediaPickerDialog from '$lib/components/media/media-picker-dialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { MAX_CARD_GALLERY_IMAGES } from '$lib/constants/cards';
	import { MEDIA_THUMBNAIL_VARIANT } from '$lib/constants/media';
	import { mediaUrl } from '$lib/content/media-urls';
	import type { MediaPickerItem } from '$lib/modules/interfaces/media.interfaces';
	import { m } from '$lib/paraglide/messages';
	import type { CardGalleryFieldProps } from './card-gallery-field.interfaces';

	let { items, languageCode, name, disabled = false }: CardGalleryFieldProps = $props();

	let gallery: MediaPreview[] = $state(untrack(() => [...items]));
	let pickerOpen = $state(false);

	const full = $derived(gallery.length >= MAX_CARD_GALLERY_IMAGES);

	function add(item: MediaPickerItem): void {
		if (full || gallery.some((entry) => entry.id === item.id)) {
			return;
		}

		gallery = [...gallery, { id: item.id, width: item.width, height: item.height }];
	}

	function remove(id: string): void {
		gallery = gallery.filter((entry) => entry.id !== id);
	}

	function move(index: number, offset: number): void {
		const target = index + offset;

		if (target < 0 || target >= gallery.length) {
			return;
		}

		const next = [...gallery];
		const [entry] = next.splice(index, 1);

		next.splice(target, 0, entry);
		gallery = next;
	}
</script>

<div class="grid gap-2" role="group" aria-labelledby={`${name}-label`}>
	<span id={`${name}-label`} class="text-sm font-medium">{m.cards_gallery()}</span>
	<p class="text-xs text-muted-foreground">{m.cards_gallery_hint()}</p>
	{#each gallery as entry (entry.id)}
		<input type="hidden" {name} value={entry.id} />
	{/each}
	{#if gallery.length > 0}
		<ul class="grid grid-cols-2 gap-2" data-testid="card-gallery">
			{#each gallery as entry, index (entry.id)}
				<li class="grid gap-1">
					<img
						src={mediaUrl(entry.id, MEDIA_THUMBNAIL_VARIANT)}
						alt=""
						width={entry.width}
						height={entry.height}
						class="aspect-square w-full rounded-xl border bg-muted object-cover"
					/>
					<div class="flex justify-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={m.card_field_move_up()}
							disabled={disabled || index === 0}
							onclick={() => move(index, -1)}
						>
							<ArrowLeft />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={m.card_field_move_down()}
							disabled={disabled || index === gallery.length - 1}
							onclick={() => move(index, 1)}
						>
							<ArrowRight />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={m.cards_gallery_remove()}
							{disabled}
							onclick={() => remove(entry.id)}
						>
							<X />
						</Button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
	<div>
		<Button
			type="button"
			variant="outline"
			size="sm"
			disabled={disabled || full}
			onclick={() => (pickerOpen = true)}
		>
			<ImagePlus />
			{m.cards_gallery_add()}
		</Button>
	</div>
</div>
<MediaPickerDialog bind:open={pickerOpen} {languageCode} onSelect={add} />
