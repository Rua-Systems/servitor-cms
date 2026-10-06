import type { EdraActions } from '../commands.interfaces';

export interface ToolbarProps {
	actions: EdraActions;
	focusMode: boolean;
	onToggleFocus?: () => void;
}
