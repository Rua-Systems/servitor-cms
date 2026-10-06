const CONTENT_NODE_TYPES = new Set(['image', 'videoEmbed', 'blockMath', 'inlineMath']);

export function hasDocumentContent(json: string): boolean {
	let value: unknown;

	try {
		value = JSON.parse(json);
	} catch {
		return false;
	}

	return nodeHasContent(value);
}

function nodeHasContent(node: unknown): boolean {
	if (typeof node !== 'object' || node === null) {
		return false;
	}

	if ('type' in node && typeof node.type === 'string' && CONTENT_NODE_TYPES.has(node.type)) {
		return true;
	}

	if ('text' in node && typeof node.text === 'string' && node.text.trim() !== '') {
		return true;
	}

	if ('content' in node && Array.isArray(node.content)) {
		return node.content.some((child: unknown) => nodeHasContent(child));
	}

	return false;
}
