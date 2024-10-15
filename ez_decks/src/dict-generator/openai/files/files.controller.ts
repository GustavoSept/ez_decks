import { Controller, Delete, Get, Param } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
   constructor(private readonly filesService: FilesService) {}

   /**
    * Endpoint to retrieve file information by ID
    * @param fileId - The ID of the file
    */
   @Get(':fileId')
   async getFile(@Param('fileId') fileId: string) {
      return await this.filesService.retrieveFile(fileId);
   }

   /**
    * Endpoint to delete a file by ID
    * @param fileId - The ID of the file to delete
    */
   @Delete(':fileId')
   async deleteFile(@Param('fileId') fileId: string) {
      return await this.filesService.deleteFile(fileId);
   }

   /**
    * Endpoint to retrieve file content by ID
    * @param fileId - The ID of the file
    */
   @Get(':fileId/content')
   async getFileContent(@Param('fileId') fileId: string) {
      return await this.filesService.retrieveFileContent(fileId);
   }
}
