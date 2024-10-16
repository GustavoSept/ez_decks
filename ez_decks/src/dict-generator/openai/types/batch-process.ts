/**
 * Represents responses when we initiate a batch process, get its status, or get a list of all processes
 * (In which case, a BatchProcess[] would be returned)
 */
export interface BatchProcess {
   id: string;
   object: string;
   endpoint: string;
   errors: { object: string; data: object[] | object } | null;
   input_file_id: string;
   completion_window: string;
   status: string;
   output_file_id: string | null;
   error_file_id: string | null;
   created_at: number;
   in_progress_at: number | null;
   expires_at: number;
   finalizing_at: number | null;
   completed_at: number | null;
   failed_at: number | null;
   expired_at: number | null;
   cancelling_at: number | null;
   cancelled_at: number | null;
   request_counts: RequestCounts;
   metadata: any | null;
}

interface RequestCounts {
   total: number;
   completed: number;
   failed: number;
}
