export function getBoxTags(inst: {
	tag?: string | null;
	ipac_reference?: string | null;
	order_name?: string | null;
}): string[] {
	if (inst.tag) {
		const splitTags = inst.tag
			.split(/[\s,;/]+/)
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean);
		if (splitTags.length > 0) {
			return splitTags;
		}
	}

	const tags = new Set<string>();
	const parseString = (str: string | null | undefined) => {
		if (!str) return;
		const tokens = str.toLowerCase().split(/[^a-z0-9]+/);
		for (const token of tokens) {
			if (token === "w" || token === "water") {
				tags.add("water");
			} else if (token === "p" || token === "power") {
				tags.add("power");
			} else if (token === "ac") {
				tags.add("ac");
			} else if (token === "nac" || token === "non-ac") {
				tags.add("non-ac");
			}
		}
	};

	parseString(inst.ipac_reference);
	parseString(inst.order_name);

	return Array.from(tags);
}
