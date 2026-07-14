import { Client } from '@notionhq/client';

export type FetchStatus = 'ok' | 'failed' | 'blocked' | 'needs_login' | 'needs_review';

export type ShopeeProduct = {
	name: string;
	brand: string | null;
	description: string | null;
	price: number | null;
	currency: string | null;
	imageUrl: string | null;
	status: FetchStatus;
};

// Notion rich_text entries are capped at 2000 chars each; split longer text across several.
function toRichText(text: string) {
	const chunks: string[] = [];
	for (let i = 0; i < text.length; i += 2000) {
		chunks.push(text.slice(i, i + 2000));
	}
	return chunks.map((content) => ({ text: { content } }));
}

function buildProperties(productUrl: string, product: ShopeeProduct) {
	return {
		Name: { title: [{ text: { content: product.name.slice(0, 2000) } }] },
		Brand: { rich_text: product.brand ? toRichText(product.brand) : [] },
		Description: { rich_text: product.description ? toRichText(product.description) : [] },
		Price: { number: product.price },
		Currency: product.currency ? { select: { name: product.currency } } : { select: null },
		'Image URL': { url: product.imageUrl },
		URL: { url: productUrl },
		'Fetch status': { select: { name: product.status } },
	};
}

// Databases hold one or more data sources; queries and page creation target the data source, not the database itself.
async function getDataSourceId(notion: Client, databaseId: string): Promise<string> {
	const database = await notion.databases.retrieve({ database_id: databaseId });
	const dataSourceId = 'data_sources' in database ? database.data_sources[0]?.id : undefined;
	if (!dataSourceId) {
		throw new Error(`Database ${databaseId} has no data sources`);
	}
	return dataSourceId;
}

async function findExistingPageId(notion: Client, dataSourceId: string, productUrl: string): Promise<string | null> {
	const { results } = await notion.dataSources.query({
		data_source_id: dataSourceId,
		filter: { property: 'URL', url: { equals: productUrl } },
		page_size: 1,
	});
	const [first] = results;
	return first?.id ?? null;
}

export async function upsertNotionProduct(
	token: string,
	databaseId: string,
	productUrl: string,
	product: ShopeeProduct,
): Promise<void> {
	const notion = new Client({ auth: token });
	const dataSourceId = await getDataSourceId(notion, databaseId);
	const properties = buildProperties(productUrl, product);
	const existingPageId = await findExistingPageId(notion, dataSourceId, productUrl);

	if (existingPageId) {
		await notion.pages.update({ page_id: existingPageId, properties });
	} else {
		await notion.pages.create({ parent: { data_source_id: dataSourceId }, properties });
	}
}
