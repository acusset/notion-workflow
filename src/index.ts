import { NotionRecipeBookWorkflow, NotionRecipeBookWorkflowParams } from "./workflow";
import homePage from "./home.html";

export type Env = {
	RECIPE_WORKFLOW: Workflow<NotionRecipeBookWorkflowParams>;
	OPENAI_API_KEY: string;
	NOTION_API_KEY: string;
	RECIPE_BOOK_DATABASE_ID: string;
};

export { NotionRecipeBookWorkflow };

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		let url = new URL(req.url);

		if (url.pathname.startsWith('/favicon')) {
			return Response.json({}, { status: 404 });
		}

		if (url.pathname === '/') {
			return new Response(homePage, { headers: { 'content-type': 'text/html;charset=UTF-8' } });
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
