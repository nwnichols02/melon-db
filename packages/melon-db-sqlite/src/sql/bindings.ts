/**
 * Serializes JavaScript values for SQLite parameter binding.
 */
export function serializeBinding(value: unknown): unknown {
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

/**
 * Maps query parameter arrays through serializeBinding.
 */
export function toSqlParams(params: unknown[]): unknown[] {
	return params.map(serializeBinding);
}
