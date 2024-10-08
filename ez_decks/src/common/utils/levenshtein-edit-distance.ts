/**
 * Levenshtein edit distance.
 * Adapted from https://github.com/words/levenshtein-edit-distance/blob/main/index.js
 *
 * @param value - String A
 * @param other - String B
 * @param insensitive - Compare insensitive to ASCII casing (default: false).
 * @returns Distance between `value` and `other`.
 */
export function levenshteinEditDistance(value: string, other: string, insensitive: boolean = false): number {
   if (value === other) {
      return 0;
   }

   if (value.length === 0) {
      return other.length;
   }

   if (other.length === 0) {
      return value.length;
   }

   if (insensitive) {
      value = value.toLowerCase();
      other = other.toLowerCase();
   }

   const codes: number[] = [];
   const cache: number[] = [];

   let index = 0;

   while (index < value.length) {
      codes[index] = value.charCodeAt(index);
      cache[index] = ++index;
   }

   let indexOther = 0;
   let result: number = 0;

   while (indexOther < other.length) {
      const code = other.charCodeAt(indexOther);
      let index = -1;
      let distance = indexOther++;
      result = distance;

      while (++index < value.length) {
         const distanceOther = code === codes[index] ? distance : distance + 1;
         distance = cache[index];
         result =
            distance > result
               ? distanceOther > result
                  ? result + 1
                  : distanceOther
               : distanceOther > distance
                 ? distance + 1
                 : distanceOther;
         cache[index] = result;
      }
   }

   return result;
}
