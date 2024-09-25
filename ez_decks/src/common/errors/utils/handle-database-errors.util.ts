import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientError } from '../types/PrismaClientError';

enum PrismaErrors {
   UniqueConstraintFail = 'P2002',
}

export const handleDatabaseErrors = (e: PrismaClientError): Error => {
   const uniqueField = e.meta?.target;

   switch (e.code) {
      case PrismaErrors.UniqueConstraintFail:
         return new ConflictException(`A record with field '${uniqueField}' already exists.`);

      default:
         return new InternalServerErrorException(`Unexpected error on database.`);
   }
};
