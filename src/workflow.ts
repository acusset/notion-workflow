import { createOpenAI } from '@ai-sdk/openai';
import { Client } from '@notionhq/client';
import { generateText, Output } from 'ai';
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import type { Env } from '.';
import { RecipeEntrySchema, toNotionChildren, toNotionProperties } from './recipeSchema';

// User-defined params passed to your workflow
export type NotionRecipeBookWorkflowParams = {
	url: URL;
};

export class NotionRecipeBookWorkflow extends WorkflowEntrypoint<Env, NotionRecipeBookWorkflowParams> {
	async run(event: WorkflowEvent<NotionRecipeBookWorkflowParams>, step: WorkflowStep) {
		const notion = new Client({ auth: this.env.NOTION_API_KEY });

		const dataSourceId = await step.do('Look up recipe database', async () => {
			const database = await notion.databases.retrieve({ database_id: this.env.RECIPE_BOOK_DATABASE_ID });
			const dataSourceId = 'data_sources' in database ? database.data_sources[0]?.id : undefined;
			if (!dataSourceId) {
				throw new Error(`Database ${this.env.RECIPE_BOOK_DATABASE_ID} has no data sources`);
			}
			return dataSourceId;
		});

		const existingPageId = await step.do('Check if recipe already exists', async () => {
			const { results } = await notion.dataSources.query({
				data_source_id: dataSourceId,
				filter: { property: 'Link', url: { equals: event.payload.url.toString() } },
			});
			return results[0]?.id ?? null;
		});

		if (existingPageId) {
			return { recipe: null, pageId: existingPageId, alreadyExists: true };
		}

		const recipe = await step.do('Use Claude to fetch resource', async () => {
			const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });
			const prompt = `Fetch "${event.payload.url.toString()}" and extract the recipe found there. Find a proper dish name to use as title, without the site name or a trailing "Recipe" suffix. Include the URL of the recipe's main photo if one is available or the best suitable image.`;
			const { output } = await generateText({
				model: openai('gpt-5-mini'),
				prompt,
				tools: {
					web_search: openai.tools.webSearch(),
				},
				output: Output.object({ schema: RecipeEntrySchema }),
			});
			return { ...output, link: output.link ?? event.payload.url.toString() };
		});

		const pageId = await step.do('Create Notion recipe entry', async () => {
			const page = await notion.pages.create({
				parent: { data_source_id: dataSourceId },
				properties: toNotionProperties(recipe),
				children: toNotionChildren(recipe),
			});
			return page.id;
		});

		return { recipe, pageId, alreadyExists: false };
	}
}
