import { anthropic } from '@ai-sdk/anthropic';
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
			const { text } = await generateText({
				model: anthropic('claude-sonnet-5'),
				prompt: `Fetch ${event.payload.url.toString()} and return basic information about the recipe found there: title, ingredients, and steps.`,
			});
			return text;
		});

		return recipeSummary;
	}
}
 