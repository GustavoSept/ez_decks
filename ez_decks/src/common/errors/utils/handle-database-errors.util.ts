import {
   BadRequestException,
   ConflictException,
   ForbiddenException,
   InternalServerErrorException,
   NotFoundException,
   PayloadTooLargeException,
   RequestTimeoutException,
   ServiceUnavailableException,
   UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientError } from '../types/PrismaClientError';

/**
 * Helper function to extract a message from PrismaClientError metadata.
 */
const extractMessage = (e: PrismaClientError, defaultMessage: string): string => {
   const cause = e.meta?.cause;
   const message = e.meta?.message;

   if (typeof cause === 'string') {
      return cause;
   } else if (typeof message === 'string') {
      return message;
   } else {
      return defaultMessage;
   }
};

/**
 * Maps Prisma error codes to NestJS exceptions.
 */
export const handleDatabaseErrors = (e: PrismaClientError): Error => {
   const { code, meta } = e;

   switch (code) {
      /**
       * Common errors (P1000 - P1017)
       */
      case 'P1000':
         return new UnauthorizedException('Invalid database credentials.');
      case 'P1001':
         return new ServiceUnavailableException('Cannot reach database server.');
      case 'P1002':
         return new RequestTimeoutException('Database server connection timed out.');
      case 'P1003':
         return new NotFoundException('Database does not exist.');
      case 'P1008':
         return new RequestTimeoutException('Operation timed out.');
      case 'P1009':
         return new ConflictException('Database already exists.');
      case 'P1010':
         return new ForbiddenException('Access denied to the database.');
      case 'P1011':
         return new InternalServerErrorException('Error opening a TLS connection.');
      case 'P1012':
         return new BadRequestException(extractMessage(e, 'Schema validation error.'));
      case 'P1013':
         return new BadRequestException(`The provided database string is invalid. ${meta?.details || ''}`);
      case 'P1014':
         return new NotFoundException(`The underlying ${meta?.kind} for model ${meta?.model} does not exist.`);
      case 'P1015':
         return new BadRequestException(
            `Your Prisma schema is using features that are not supported for the version of the database.
 Database version: ${meta?.database_version}
 Errors:
 ${meta?.errors}`
         );
      case 'P1016':
         return new BadRequestException(
            `Your raw query had an incorrect number of parameters. Expected: ${meta?.expected}, actual: ${meta?.actual}.`
         );
      case 'P1017':
         return new ServiceUnavailableException('Server has closed the connection.');

      /**
       * Prisma Client (Query Engine) errors (P2000 - P2037)
       */
      case 'P2000':
         return new BadRequestException(`Value too long for column type. Column: ${meta?.column_name}`);
      case 'P2001':
         return new NotFoundException(`Record not found: ${meta?.model_name}.${meta?.argument_name} = ${meta?.argument_value}`);
      case 'P2002':
         return new ConflictException(`Unique constraint failed on the fields: (${meta?.target}).`);
      case 'P2003':
         return new ConflictException(`Foreign key constraint failed on the field: ${meta?.field_name}`);
      case 'P2004':
         return new BadRequestException(`A constraint failed on the database: ${meta?.database_error}`);
      case 'P2005':
         return new InternalServerErrorException(
            `Invalid value ${meta?.field_value} stored in the database for field ${meta?.field_name}.`
         );
      case 'P2006':
         return new BadRequestException(`Invalid value ${meta?.field_value} for ${meta?.model_name} field ${meta?.field_name}.`);
      case 'P2007':
         return new BadRequestException(`Data validation error: ${meta?.database_error}`);
      case 'P2008':
      case 'P2009':
      case 'P2010':
      case 'P2016':
      case 'P2019':
      case 'P2026':
      case 'P2027':
      case 'P2028':
      case 'P2029':
      case 'P2030':
      case 'P2031':
      case 'P2033':
      case 'P2035':
      case 'P2036':
         return new InternalServerErrorException(extractMessage(e, 'An unexpected error occurred.'));
      case 'P2011':
         return new BadRequestException(`Null constraint violation on the ${meta?.constraint}`);
      case 'P2012':
         return new BadRequestException(`Missing required value at ${meta?.path}`);
      case 'P2013':
         return new BadRequestException(
            `Missing required argument ${meta?.argument_name} for field ${meta?.field_name} on ${meta?.object_name}.`
         );
      case 'P2014':
         return new BadRequestException(
            `The change would violate the required relation '${meta?.relation_name}' between ${meta?.model_a_name} and ${meta?.model_b_name}.`
         );
      case 'P2015':
      case 'P2018':
      case 'P2025':
         return new NotFoundException(extractMessage(e, 'Required related records not found.'));
      case 'P2017':
         return new BadRequestException(
            `The records for relation ${meta?.relation_name} between ${meta?.parent_name} and ${meta?.child_name} are not connected.`
         );
      case 'P2020':
         return new BadRequestException(`Value out of range for the type. ${meta?.details}`);
      case 'P2021':
         return new InternalServerErrorException(`The table ${meta?.table} does not exist in the current database.`);
      case 'P2022':
         return new InternalServerErrorException(`The column ${meta?.column} does not exist in the current database.`);
      case 'P2023':
         return new InternalServerErrorException(`Inconsistent column data: ${meta?.message}`);
      case 'P2024':
         return new ServiceUnavailableException(`Timed out fetching a new connection from the connection pool.`);
      case 'P2025':
         return new NotFoundException(
            `An operation failed because it depends on one or more records that were required but not found. ${meta?.cause}`
         );
      case 'P2034':
         return new ConflictException('Transaction failed due to a write conflict or deadlock. Please retry.');
      case 'P2037':
         return new ServiceUnavailableException(`Too many database connections opened: ${meta?.message}`);

      /**
       * Prisma Migrate (Schema Engine) errors (P3000 - P3022)
       */
      case 'P3000':
         return new InternalServerErrorException(
            `Failed to create database: ${extractMessage(e, meta?.database_error || 'Reason unknown.')}`
         );
      case 'P3001':
         return new BadRequestException(
            `Migration possible with destructive changes and possible data loss: ${meta?.migration_engine_destructive_details}`
         );
      case 'P3002':
         return new InternalServerErrorException(`The attempted migration was rolled back: ${meta?.database_error}`);
      case 'P3003':
         return new InternalServerErrorException(
            `The format of migrations changed, and the saved migrations are no longer valid. Please follow the steps at: https://pris.ly/d/migrate`
         );
      case 'P3004':
         return new BadRequestException(`The ${meta?.database_name} database is a system database and should not be altered.`);
      case 'P3005':
         return new BadRequestException(
            `The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline`
         );
      case 'P3006':
         return new InternalServerErrorException(
            `Migration ${meta?.migration_name} failed to apply cleanly to the shadow database.\n${meta?.error_code} Error:\n${meta?.inner_error}`
         );
      case 'P3007':
         return new BadRequestException(
            `Some of the requested preview features are not yet allowed in the schema engine. Please remove them from your data model before using migrations. (blocked: ${meta?.list_of_blocked_features})`
         );
      case 'P3008':
         return new ConflictException(`The migration ${meta?.migration_name} is already recorded as applied in the database.`);
      case 'P3009':
         return new InternalServerErrorException(
            `Migrate found failed migrations in the target database, new migrations will not be applied. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\n${meta?.details}`
         );
      case 'P3010':
         return new BadRequestException(`The name of the migration is too long. It must not be longer than 200 characters (bytes).`);
      case 'P3011':
         return new BadRequestException(
            `Migration ${meta?.migration_name} cannot be rolled back because it was never applied to the database.`
         );
      case 'P3012':
         return new BadRequestException(`Migration ${meta?.migration_name} cannot be rolled back because it is not in a failed state.`);
      case 'P3013':
         return new BadRequestException(
            `Datasource provider arrays are no longer supported in migrate. Please change your datasource to use a single provider. Read more at https://pris.ly/multi-provider-deprecation`
         );
      case 'P3014':
         return new InternalServerErrorException(
            `Prisma Migrate could not create the shadow database. Please make sure the database user has permission to create databases. Read more about the shadow database at https://pris.ly/d/migrate-shadow.\n\nOriginal error: ${meta?.error_code}\n${meta?.inner_error}`
         );
      case 'P3015':
         return new NotFoundException(
            `Could not find the migration file at ${meta?.migration_file_path}. Please delete the directory or restore the migration file.`
         );
      case 'P3016':
         return new InternalServerErrorException(
            `The fallback method for database resets failed, meaning Migrate could not clean up the database entirely. Original error: ${meta?.error_code}\n${meta?.inner_error}`
         );
      case 'P3017':
         return new NotFoundException(
            `The migration ${meta?.migration_name} could not be found. Please make sure that the migration exists, and that you included the whole name of the directory.`
         );
      case 'P3018':
         return new InternalServerErrorException(
            `A migration failed to apply. New migrations cannot be applied before the error is resolved. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: ${meta?.migration_name}\n\nDatabase error code: ${meta?.database_error_code}\n\nDatabase error:\n${meta?.database_error}`
         );
      case 'P3019':
         return new ConflictException(
            `The datasource provider ${meta?.provider} specified in your schema does not match the one specified in the migration_lock.toml, ${meta?.expected_provider}. Please remove your current migration directory and start a new migration history with prisma migrate dev. Read more: https://pris.ly/d/migrate-provider-switch`
         );
      case 'P3020':
         return new BadRequestException(
            `The automatic creation of shadow databases is disabled on Azure SQL. Please set up a shadow database using the shadowDatabaseUrl datasource attribute.\nRead the docs page for more details: https://pris.ly/d/migrate-shadow`
         );
      case 'P3021':
         return new BadRequestException(
            `Foreign keys cannot be created on this database. Learn more how to handle this: https://pris.ly/d/migrate-no-foreign-keys`
         );
      case 'P3022':
         return new BadRequestException(
            `Direct execution of DDL (Data Definition Language) SQL statements is disabled on this database. Please read more here about how to handle this: https://pris.ly/d/migrate-no-direct-ddl`
         );

      /**
       * prisma db pull errors (P4000 - P4002)
       */
      case 'P4000':
         return new InternalServerErrorException(`Introspection operation failed to produce a schema file: ${meta?.introspection_error}`);
      case 'P4001':
         return new NotFoundException(`The introspected database was empty.`);
      case 'P4002':
         return new BadRequestException(`The schema of the introspected database was inconsistent: ${meta?.explanation}`);

      /**
       * Prisma Accelerate errors (P6000 - P6010)
       */
      case 'P6000': // ServerError
      case 'P6100': // Prisma Pulse ServerError
         return new InternalServerErrorException(`An unexpected server error occurred.`);
      case 'P6001': // InvalidDataSource
         return new BadRequestException(`Invalid data source: The URL is malformed; it does not use the prisma:// protocol.`);
      case 'P6002': // Unauthorized
      case 'P6102': // Prisma Pulse Unauthorized
         return new UnauthorizedException(`Invalid API Key in the connection string.`);
      case 'P6003': // PlanLimitReached
      case 'P6010': // ProjectDisabledError
      case 'P6103': // Prisma Pulse ProjectDisabledError
      case 'P6104': // AccountHoldError
         return new ForbiddenException(extractMessage(e, 'Access to the resource is forbidden.'));
      case 'P6004': // QueryTimeout
         return new RequestTimeoutException(`The global timeout of Accelerate has been exceeded.`);
      case 'P6005': // InvalidParameters
         return new BadRequestException(`Invalid parameters supplied.`);
      case 'P6006': // VersionNotSupported
      case 'P6105': // Prisma Pulse VersionNotSupported
         return new BadRequestException(`The Prisma version of the project is not compatible.`);
      case 'P6008': // ConnectionError | EngineStartError
         return new InternalServerErrorException(`The engine failed to start. Could not establish a connection to the database.`);
      case 'P6009': // ResponseSizeLimitExceeded
         return new PayloadTooLargeException(`The global response size limit of Accelerate has been exceeded.`);

      /**
       * Prisma Pulse errors (P6100 - P6105)
       */
      case 'P6101': // DatasourceError
         return new BadRequestException(
            `Datasource error: The datasource is not reachable by Prisma Pulse or did not meet the requirements.`
         );

      /**
       * Default case for unhandled error codes
       */
      default:
         return new InternalServerErrorException('An unexpected database error occurred.');
   }
};
