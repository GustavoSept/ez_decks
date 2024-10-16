/**
 * Represents a single line of a .JSONL file. Used in an array of BatchUnit to send batches to OpenAI.
 */
export interface BatchUnit {
   custom_id: string;
   method: 'POST';
   url: '/v1/chat/completions';
   body: {
      model: string;
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
      max_tokens: number;
      response_format?;
   };
}
