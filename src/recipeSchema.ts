import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints/common';
import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints/pages';
import { z } from 'zod';

export const RECIPE_BOOK_DATABASE_ID = '2274986d-44dd-4677-b1a4-01c57bfc8b2a';

export const StarRatingSchema = z.enum(['★★★★★', '★★★★', '★★★', '★★', '★']);

export const TagSchema = z.enum([
	'Dessert',
	'Dinner',
	'Easy',
	'Breakfast',
	'Lunch',
	'Italian',
	'Spicy',
	'Side',
	'Hearty',
	'Light',
	'Slow Cooker',
	'Drink',
	'Pasta',
	'Brunch',
	'Tart',
	'Family Recipe',
	'Asian',
	'French',
	'Healthy',
	'Dressing',
]);

export const RecipeEntrySchema = z.object({
	// --- Database properties ---
	/** Recipe title */
	name: z.string().min(1),
	/** Source URL */
	link: z.string().optional(),
	/** Star rating */
	starRating: StarRatingSchema.optional(),
	/** Category / cuisine tags */
	tags: z.array(TagSchema).optional(),
	/** Human-readable total cooking time, e.g. "45 mins" */
	totalTime: z.string().optional(),
	/** Number of servings */
	yield: z.number().positive().optional(),

	// --- Page body content ---
	/** List of ingredients, each rendered as a bullet point */
	ingredients: z.array(z.string().min(1)).optional(),
	/** Step-by-step instructions, each rendered as a numbered list item */
	instructions: z.array(z.string().min(1)).optional(),
	/** Free-form notes, tips, or variations */
	notes: z.string().optional(),
});

export type RecipeEntry = z.infer<typeof RecipeEntrySchema>;

type NotionPageProperties = NonNullable<CreatePageParameters['properties']>;

/** Converts a validated RecipeEntry into the `properties` shape for `notion.pages.create()` */
export function toNotionProperties(recipe: RecipeEntry): NotionPageProperties {
	return {
		Name: {
			title: [{ text: { content: recipe.name } }],
		},
		...(recipe.link != null && {
			Link: { url: recipe.link },
		}),
		...(recipe.starRating != null && {
			'Star Rating': { select: { name: recipe.starRating } },
		}),
		...(recipe.tags != null && recipe.tags.length > 0 && {
			Tags: { multi_select: recipe.tags.map((name) => ({ name })) },
		}),
		...(recipe.totalTime != null && {
			'Total Time': { rich_text: [{ text: { content: recipe.totalTime } }] },
		}),
		...(recipe.yield != null && {
			Yield: { number: recipe.yield },
		}),
	};
}

/** Converts a validated RecipeEntry into the `children` block array for `notion.pages.create()` */
export function toNotionChildren(recipe: RecipeEntry): BlockObjectRequest[] {
	const blocks: BlockObjectRequest[] = [];

	if (recipe.ingredients && recipe.ingredients.length > 0) {
		blocks.push({
			type: 'heading_1',
			heading_1: { rich_text: [{ type: 'text', text: { content: 'Ingredients' } }] },
		});
		for (const ingredient of recipe.ingredients) {
			blocks.push({
				type: 'bulleted_list_item',
				bulleted_list_item: { rich_text: [{ type: 'text', text: { content: ingredient } }] },
			});
		}
	}

	if (recipe.instructions && recipe.instructions.length > 0) {
		blocks.push({
			type: 'heading_1',
			heading_1: { rich_text: [{ type: 'text', text: { content: 'Instructions' } }] },
		});
		for (const step of recipe.instructions) {
			blocks.push({
				type: 'numbered_list_item',
				numbered_list_item: { rich_text: [{ type: 'text', text: { content: step } }] },
			});
		}
	}

	if (recipe.notes) {
		blocks.push({
			type: 'heading_1',
			heading_1: { rich_text: [{ type: 'text', text: { content: 'Notes' } }] },
		});
		blocks.push({
			type: 'paragraph',
			paragraph: { rich_text: [{ type: 'text', text: { content: recipe.notes } }] },
		});
	}

	return blocks;
}
