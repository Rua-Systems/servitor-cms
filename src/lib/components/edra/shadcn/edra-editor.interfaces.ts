export interface EdraEditorProps {
	content: string;
	languageCode: string;
	onChange: (content: string) => void;
	onBlur?: () => void;
	focusMode?: boolean;
	onToggleFocus?: () => void;
	class?: string;
}
