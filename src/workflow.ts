import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import type { Env } from '.';

// User-defined params passed to your workflow
export type NotionRecipeBookWorkflowParams = {
	url: URL;
};

export class NotionRecipeBookWorkflow extends WorkflowEntrypoint<Env, NotionRecipeBookWorkflowParams> {
	async run(event: WorkflowEvent<NotionRecipeBookWorkflowParams>, step: WorkflowStep) {
		const recipeSummary = await step.do('Use Claude to fetch resource', async () => {
			const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });
			const { text } = await generateText({
				model: openai('gpt-5-mini'),
				prompt: `Fetch ${event.payload.url.toString()} and return basic information about the recipe found there: title, ingredients, and steps.`,
				tools: {
					web_search: openai.tools.webSearch(),
				}
			});
			return text;
		});

		return recipeSummary;
	}
}
