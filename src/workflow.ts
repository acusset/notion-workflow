import { createOpenAI } from '@ai-sdk/openai';
import { Client } from '@notionhq/client';
import { generateText, Output } from 'ai';
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import type { Env } from '.';
import { RECIPE_BOOK_DATABASE_ID, RecipeEntrySchema, toNotionChildren, toNotionProperties } from './recipeSchema';

// User-defined params passed to your workflow
export type NotionRecipeBookWorkflowParams = {
	url: URL;
};

export class NotionRecipeBookWorkflow extends WorkflowEntrypoint<Env, NotionRecipeBookWorkflowParams> {
	async run(event: WorkflowEvent<NotionRecipeBookWorkflowParams>, step: WorkflowStep) {
		const recipe = await step.do('Use Claude to fetch resource', async () => {
			const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });
			const prompt = `Fetch "${event.payload.url.toString()}" and extract the recipe found there.`;
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
			const notion = new Client({ auth: this.env.NOTION_API_KEY });

			const database = await notion.databases.retrieve({ database_id: RECIPE_BOOK_DATABASE_ID });
			const dataSourceId = 'data_sources' in database ? database.data_sources[0]?.id : undefined;
			if (!dataSourceId) {
				throw new Error(`Database ${RECIPE_BOOK_DATABASE_ID} has no data sources`);
			}

			const page = await notion.pages.create({
				parent: { data_source_id: dataSourceId },
				properties: toNotionProperties(recipe),
				children: toNotionChildren(recipe),
			});
			return page.id;
		});

		return { recipe, pageId };
	}
}
