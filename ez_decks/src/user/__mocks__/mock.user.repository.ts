import { User } from '@prisma/client';
import { Prisma } from '@prisma/client';

export class MockUserRepository {
   private users: User[] = []; // In-memory store for users

   async create(data: Prisma.UserCreateInput): Promise<User> {
      const newUser: User = {
         id: this.users.length + 1, // Simulating auto-incremented ID
         email: data.email,
         name: data.name,
         isAdmin: data.isAdmin ?? false, // Default to false if not provided
      };
      this.users.push(newUser);
      return newUser;
   }

   async findMany(params: {
      skip?: number;
      take?: number;
      cursor?: Prisma.UserWhereUniqueInput;
      where?: Prisma.UserWhereInput;
      orderBy?: Prisma.UserOrderByWithRelationInput;
   }): Promise<User[]> {
      let users = [...this.users];

      if (params.where) {
         users = users.filter((user) => {
            return Object.entries(params.where!).every(([key, value]) => {
               return user[key] === value;
            });
         });
      }

      if (params.skip) {
         users = users.slice(params.skip);
      }

      if (params.take) {
         users = users.slice(0, params.take);
      }

      return users;
   }

   async findOne(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
      return this.users.find((user) => user.id === where.id || user.email === where.email) || null;
   }

   async update(params: {
      where: Prisma.UserWhereUniqueInput;
      data: Prisma.UserUpdateInput;
   }): Promise<User | null> {
      const index = this.users.findIndex((user) => user.id === params.where.id);
      if (index !== -1) {
         const currentUser = this.users[index];
         const updatedUser: User = {
            ...currentUser,
            email: typeof params.data.email === 'string' ? params.data.email : currentUser.email,
            name: typeof params.data.name === 'string' ? params.data.name : currentUser.name,
            isAdmin: typeof params.data.isAdmin === 'boolean' ? params.data.isAdmin : currentUser.isAdmin,
         };
         this.users[index] = updatedUser;
         return updatedUser;
      }
      return null;
   }

   async remove(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
      const index = this.users.findIndex((user) => user.id === where.id);
      if (index !== -1) {
         const [deletedUser] = this.users.splice(index, 1);
         return deletedUser;
      }
      return null;
   }
}
