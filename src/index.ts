import { NotionRecipeBookWorkflow, NotionRecipeBookWorkflowParams } from "./workflow";

export type Env = {
	RECIPE_WORKFLOW: Workflow<NotionRecipeBookWorkflowParams>;
	OPENAI_API_KEY: string;
	NOTION_API_KEY: string;
};

export { NotionRecipeBookWorkflow };

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		let url = new URL(req.url);

		if (url.pathname.startsWith('/favicon')) {
			return Response.json({}, { status: 404 });
		}

		let id = url.searchParams.get('instanceId');
		if (id) {
			let instance = await env.RECIPE_WORKFLOW.get(id);
			return Response.json({
				status: await instance.status(),
			});
		}

		let resource = url.searchParams.get('resource');
		if (!resource) {
			return Response.json({
				error: 'Missing resource parameter',
			}, { status: 400 });
		}

		let instance = await env.RECIPE_WORKFLOW.create({
			params: {
				url: new URL(resource),
			},
		});

		return Response.json({
			id: instance.id,
			details: await instance.status(),
		});
	},
};
