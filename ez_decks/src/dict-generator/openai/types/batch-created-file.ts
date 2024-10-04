/**
 * When creating a file on OpenAI (to then run further inferences), this is the response we get back
 */
export interface CreatedFileObject {
   object: string;
   id: string;
   purpose: string;
   filename: string;
   bytes: number;
   created_at: number;
   status: string;
   status_details: string | null;
}
