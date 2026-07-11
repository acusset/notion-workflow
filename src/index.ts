import { Env, ShopeeProductSyncWorkflow } from './workflow';

export { ShopeeProductSyncWorkflow };

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		let url = new URL(req.url);

		if (url.pathname.startsWith('/favicon')) {
			return Response.json({}, { status: 404 });
		}

		// Get the status of an existing instance, if provided
		// GET /?instanceId=<id here>
		let id = url.searchParams.get('instanceId');
		if (id) {
			let instance = await env.MY_WORKFLOW.get(id);
			return Response.json({
				status: await instance.status(),
			});
		}

		// Spawn a new instance and return the ID and status
		let instance = await env.MY_WORKFLOW.create();
		// You can also set the ID to match an ID in your own system
		// and pass an optional payload to the Workflow
		// let instance = await env.MY_WORKFLOW.create({
		// 	id: 'id-from-your-system',
		// 	params: { payload: 'to send' },
		// });
		return Response.json({
			id: instance.id,
			details: await instance.status(),
		});
	},
};
