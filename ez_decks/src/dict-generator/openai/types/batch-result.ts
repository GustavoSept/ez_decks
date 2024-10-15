/**
 * Represents a typical Response from OpenAI, from "get results" endpoint
 */
export interface BatchResponse {
   results: BatchResult[];
   errors: any[];
}

export interface BatchResult {
   id: string;
   custom_id: string;
   response: BatchResponseData;
   error: any;
}

interface BatchResponseData {
   status_code: number;
   request_id: string;
   body: BatchBody;
}

interface BatchBody {
   id: string;
   object: string;
   created: number;
   model: string;
   choices: BatchChoice[];
   usage: OpenAIUsage;
   system_fingerprint: string;
}

interface BatchChoice {
   index: number;
   message: BatchMessage;
   logprobs: any;
   finish_reason: string;
}

interface BatchMessage {
   role: string;
   content: string; // Where our actual response is
   refusal: any;
}

interface OpenAIUsage {
   prompt_tokens: number;
   completion_tokens: number;
   total_tokens: number;
   prompt_tokens_details: OpenAITokenDetails;
   completion_tokens_details: OpenAITokenDetails;
}

interface OpenAITokenDetails {
   cached_tokens: number;
   reasoning_tokens: number;
}
