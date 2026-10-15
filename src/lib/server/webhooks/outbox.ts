import { eq } from 'drizzle-orm';
import type { PostWebhookEvent, WebhookEvent } from '../../constants/webhooks';
import type { DatabaseExecutor } from '../db';
import { cardTypes, posts, webhookDeliveries, webhooks } from '../db/schema';
import type { PostEventTarget } from './outbox.interfaces';

const CARD_EVENTS: Record<PostWebhookEvent, WebhookEvent> = {
	'post.published': 'card.published',
	'post.updated': 'card.updated',
	'post.unpublished': 'card.unpublished',
	'post.hidden': 'card.hidden',
	'post.unhidden': 'card.unhidden',
	'post.deleted': 'card.deleted'
};

export function enqueuePostEvent(
	tx: DatabaseExecutor,
	postEvent: PostWebhookEvent,
	target: PostEventTarget,
	now: Date = new Date()
): number {
	const cardType = cardTypeKeyOf(tx, target.postId);
	let event: WebhookEvent = postEvent;
	let subject: Record<string, string> = { post_id: target.postId };

	if (cardType !== null) {
		event = CARD_EVENTS[postEvent];
		subject = { card_id: target.postId, card_type: cardType };
	}

	const subscribers = tx
		.select({ id: webhooks.id, events: webhooks.events })
		.from(webhooks)
		.where(eq(webhooks.enabled, true))
		.all()
		.filter((webhook) => webhook.events.includes(event));

	for (const subscriber of subscribers) {
		const id = crypto.randomUUID();
		const payload = JSON.stringify({
			event,
			delivery_id: id,
			timestamp: now.toISOString(),
			...subject,
			languages: target.translations.map((translation) => translation.languageCode),
			slugs: Object.fromEntries(
				target.translations.map((translation) => [
					translation.languageCode,
					translation.slug
				])
			)
		});

		tx.insert(webhookDeliveries)
			.values({
				id,
				webhookId: subscriber.id,
				event,
				payload,
				status: 'pending',
				nextAttemptAt: now,
				createdAt: now
			})
			.run();
	}

	return subscribers.length;
}

function cardTypeKeyOf(tx: DatabaseExecutor, postId: string): string | null {
	const row = tx
		.select({ key: cardTypes.key })
		.from(posts)
		.innerJoin(cardTypes, eq(cardTypes.id, posts.cardTypeId))
		.where(eq(posts.id, postId))
		.get();

	return row?.key ?? null;
}
