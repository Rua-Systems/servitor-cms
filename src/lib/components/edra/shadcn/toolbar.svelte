<script lang="ts">
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import { Separator } from '$lib/components/ui/separator';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import {
		blockCommands,
		blockTypeCommands,
		commandStatus,
		historyCommands,
		insertCommands,
		listCommands,
		markCommands,
		shortcutLabel
	} from '../commands';
	import type { EdraCommand } from '../commands.interfaces';
	import { isApplePlatform } from '../platform';
	import { getEditor, useEditorTransaction } from '../tiptap';
	import ColorMenu from './color-menu.svelte';
	import LinkPopover from './link-popover.svelte';
	import ToolbarButton from './toolbar-button.svelte';
	import type { ToolbarProps } from './toolbar.interfaces';

	let { actions, focusMode, onToggleFocus }: ToolbarProps = $props();

	const editor = getEditor();
	const transaction = useEditorTransaction(editor);
	const apple = isApplePlatform();
	const groups = $derived([
		historyCommands(),
		blockTypeCommands(),
		markCommands(),
		blockCommands(),
		listCommands(),
		insertCommands(actions)
	]);
	const status = $derived(commandStatus(editor, groups.flat(), transaction.version));

	function shortcutOf(command: EdraCommand): string {
		if (command.shortcut === undefined) {
			return '';
		}

		return shortcutLabel(command.shortcut, apple);
	}
</script>

<div
	role="toolbar"
	aria-label={m.editor_toolbar()}
	class={cn(
		'sticky z-10 flex flex-wrap items-center gap-0.5 border-b bg-background/95 p-1.5',
		focusMode && 'top-0',
		!focusMode && 'top-14 lg:top-0'
	)}
>
	{#each groups as group, index (index)}
		{#if index > 0}
			<Separator orientation="vertical" class="mx-1 h-5!" />
		{/if}
		{#each group as command (command.id)}
			<ToolbarButton
				label={command.label}
				shortcut={shortcutOf(command)}
				active={status.active.has(command.id)}
				disabled={status.disabled.has(command.id)}
				onclick={() => command.run(editor)}
			>
				<command.icon />
			</ToolbarButton>
		{/each}
		{#if index === 2}
			<LinkPopover />
			<ColorMenu />
		{/if}
	{/each}
	{#if onToggleFocus !== undefined}
		<div class="ml-auto">
			<ToolbarButton label={m.editor_focus_mode()} active={focusMode} onclick={onToggleFocus}>
				{#if focusMode}
					<Minimize2 />
				{:else}
					<Maximize2 />
				{/if}
			</ToolbarButton>
		</div>
	{/if}
</div>
