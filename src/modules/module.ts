import Context from '../lib/context.ts';

export abstract class AbstractModule {
	protected readonly context: Context;
	constructor(context: Context) {
		this.context = context;
	}
	abstract build(): Promise<void>;
}
