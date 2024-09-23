import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserService {
   constructor(private readonly prisma: PrismaService) {}

   async create(data: Prisma.UserCreateInput): Promise<User> {
      return this.prisma.user.create({
         data,
      });
   }

   findMany(params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.UserWhereUniqueInput;
      where?: Prisma.UserWhereInput;
      orderBy?: Prisma.UserOrderByWithRelationInput;
   }): Promise<User[]> {
      const { skip, take, cursor, where, orderBy } = params;
      return this.prisma.user.findMany({
         skip,
         take,
         cursor,
         where,
         orderBy,
      });
   }

   findOne(id: Prisma.UserWhereUniqueInput): Promise<User | null> {
      return this.prisma.user.findUnique({
         where: id,
      });
   }

   update(params: { where: Prisma.UserWhereUniqueInput; data: Prisma.UserUpdateInput }) {
      const { where, data } = params;
      return this.prisma.user.update({
         data,
         where,
      });
   }

   remove(id: Prisma.UserWhereUniqueInput) {
      return this.prisma.user.delete({ where: id });
   }
}
