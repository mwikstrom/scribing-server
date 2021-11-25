/** @internal */
export const getAge = (value: Date): number => Date.now() - value.getTime();

/** @internal */
export const ONE_SECOND = 1000;

/** @internal */
export const ONE_MINUTE = 60 * ONE_SECOND;
