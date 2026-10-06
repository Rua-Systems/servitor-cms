import { hasDocumentContent } from '../../content/document-content';
import type { TranslationDraftInput } from './posts.interfaces';
import type { PublishRequirementStatus } from './publish-requirements.interfaces';

export function missingPublishRequirement(
	input: TranslationDraftInput
): PublishRequirementStatus | null {
	if (input.title.trim() === '') {
		return 'title_required';
	}

	if (!hasDocumentContent(input.content)) {
		return 'content_required';
	}

	if (input.excerpt.trim() === '') {
		return 'excerpt_required';
	}

	if ((input.metaDescription ?? '').trim() === '') {
		return 'meta_description_required';
	}

	return null;
}
