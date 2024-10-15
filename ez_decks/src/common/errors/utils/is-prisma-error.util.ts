import { PrismaClientError } from '../types/PrismaClientError';

export const isPrismaError = (e: PrismaClientError | Error): e is PrismaClientError => {
   return (
      typeof (e as PrismaClientError).code === 'string' &&
      typeof (e as PrismaClientError).clientVersion === 'string' &&
      (typeof (e as PrismaClientError).meta === 'undefined' ||
         typeof (e as PrismaClientError).meta === 'object')
   );
};
