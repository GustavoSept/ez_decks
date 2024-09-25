import { Prisma } from '@prisma/client';

// Hotfix: getting proper type annotation on `PrismaClientKnownRequestError`
export type PrismaClientError = Prisma.PrismaClientKnownRequestError & {
   meta?: { target: string; database_error: string | undefined };
};
