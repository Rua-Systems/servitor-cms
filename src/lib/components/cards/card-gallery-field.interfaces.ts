import type { MediaPreview } from '$lib/components/media/media-field.interfaces';

export interface CardGalleryFieldProps {
	items: MediaPreview[];
	languageCode: string;
	name: string;
	disabled?: boolean;
}
