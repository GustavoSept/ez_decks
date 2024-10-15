/**
 * Represents a list of OpenAI batches.
 *
 * Each batch contains up to 50k arrays ('requests').
 * Each request has up to `wordCapacity` words in it (default is 8).
 *
 * See DictGeneratorService.splitFileIntoBatches() for more info.
 */
export interface OpenAIBatch {
   arrays: string[][];
}
