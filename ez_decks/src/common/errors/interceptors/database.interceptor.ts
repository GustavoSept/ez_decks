import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { catchError, Observable } from 'rxjs';
import { handleDatabaseErrors } from '../utils/handle-database-errors.util';
import { isPrismaError } from '../utils/is-prisma-error.util';
import { PrismaClientError } from '../types/PrismaClientError';

@Injectable()
export class DatabaseInterceptor implements NestInterceptor {
   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      return next.handle().pipe(
         catchError((error: Error | PrismaClientError) => {
            if (isPrismaError(error)) {
               error = handleDatabaseErrors(error);
            }
            throw error;
         })
      );
   }
}
