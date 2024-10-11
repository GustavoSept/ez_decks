import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_SDK } from '../constants';

@Injectable()
export class FilesService {
   constructor(@Inject(OPENAI_SDK) private readonly openai: OpenAI) {}

   /**
    * Retrieve file information from OpenAI by file ID
    * @param fileId - The ID of the file to retrieve information for
    */
   async retrieveFile(fileId: string) {
      try {
         const file = await this.openai.files.retrieve(fileId);
         return file;
      } catch (error) {
         if (error instanceof Error) {
            throw new Error(`Failed to retrieve file: ${error.message}`);
         } else {
            throw new Error('Failed to retrieve file: Unknown error');
         }
      }
   }

   /**
    * Delete a file from OpenAI by file ID
    * @param fileId - The ID of the file to delete
    */
   async deleteFile(fileId: string) {
      try {
         const result = await this.openai.files.del(fileId);
         return result;
      } catch (error) {
         if (error instanceof Error) {
            throw new Error(`Failed to delete file: ${error.message}`);
         } else {
            throw new Error('Failed to delete file: Unknown error');
         }
      }
   }

   /**
    * Retrieve file content from OpenAI by file ID
    * @param fileId - The ID of the file to retrieve content for
    */
   async retrieveFileContent(fileId: string): Promise<string> {
      try {
         const response = await this.openai.files.content(fileId);
         const content = await response.text();
         return content;
      } catch (error) {
         if (error instanceof Error) {
            throw new Error(`Failed to retrieve file content: ${error.message}`);
         } else {
            throw new Error('Failed to retrieve file content: Unknown error');
         }
      }
   }
}
