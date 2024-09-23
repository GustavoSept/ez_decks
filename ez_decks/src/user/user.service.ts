import { Injectable } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
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

   findOne(query: Prisma.UserWhereUniqueInput): Promise<User | null> {
      return this.prisma.user.findUnique({
         where: query,
      });
   }

   // update(id: number, updateUserDto: UpdateUserDto) {
   //    return `This action updates a #${id} user`;
   // }

   // remove(id: number) {
   //    return `This action removes a #${id} user`;
   // }
}
