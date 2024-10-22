/**
 * Wraps a promise, forcing it to return two items: possible error, and the promise itself
 */
export function catchError<T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> {
   return promise
      .then((data) => {
         return [undefined, data] as [undefined, T];
      })
      .catch((error) => {
         return [error];
      });
}

/**
 * Wraps a promise. Returns errors if they're expected (on `errorsToCatch`), throw unexpected errors.
 * @param promise Whatever promise object
 * @param errorsToCatch an Array of error types that are expected to happen
 * @returns hopefully a [error, promise]. Can throw unexpected errors
 */
export function catchErrorTyped<T, E extends new (message?: string) => Error>(
   promise: Promise<T>,
   errorsToCatch?: E[]
): Promise<[undefined, T] | [InstanceType<E>]> {
   return promise
      .then((data) => {
         return [undefined, data] as [undefined, T];
      })
      .catch((error) => {
         if (errorsToCatch == undefined) {
            return [error];
         }

         if (errorsToCatch.some((e) => error instanceof e)) {
            return [error];
         }

         throw error;
      });
}
