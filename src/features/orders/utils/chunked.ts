/**
 * Helpers for running Supabase `.in()` queries/mutations over large id
 * lists without hitting URL-length limits.
 */

const IN_QUERY_CHUNK_SIZE = 120;

export const chunkArray = <T>(
	items: T[],
	size = IN_QUERY_CHUNK_SIZE,
): T[][] => {
	if (!items.length) return [];
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}
	return chunks;
};

export const queryRowsInChunks = async <T>(
	ids: string[],
	runner: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> => {
	if (!ids.length) return [];
	const rows: T[] = [];
	for (const chunk of chunkArray(ids)) {
		const { data, error } = await runner(chunk);
		if (error) throw error;
		if (data?.length) rows.push(...data);
	}
	return rows;
};

export const mutateInChunks = async (
	ids: string[],
	runner: (chunk: string[]) => PromiseLike<{ error: any }>,
): Promise<void> => {
	if (!ids.length) return;
	for (const chunk of chunkArray(ids)) {
		const { error } = await runner(chunk);
		if (error) throw error;
	}
};
