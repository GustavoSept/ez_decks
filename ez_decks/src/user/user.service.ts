import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
   constructor(private readonly repo: UserRepository) {}

   async create(data: Prisma.UserCreateInput): Promise<User> {
      return this.repo.create(data);
   }

   findMany(params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.UserWhereUniqueInput;
      where?: Prisma.UserWhereInput;
      orderBy?: Prisma.UserOrderByWithRelationInput;
   }): Promise<User[]> {
      const { skip, take, cursor, where, orderBy } = params;
      return this.repo.findMany({
         skip,
         take,
         cursor,
         where,
         orderBy,
      });
   }

   findOne(id: Prisma.UserWhereUniqueInput): Promise<User | null> {
      return this.repo.findOne(id);
   }

   update(params: { where: Prisma.UserWhereUniqueInput; data: Prisma.UserUpdateInput }) {
      return this.repo.update(params);
   }

   remove(id: Prisma.UserWhereUniqueInput) {
      return this.repo.remove(id);
   }
}
