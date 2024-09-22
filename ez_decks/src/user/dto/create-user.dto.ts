import { User } from '@prisma/client';
import { IsBoolean, IsString } from 'class-validator';

export class CreateUserDto implements Partial<User> {
   @IsString()
   email!: string;

   @IsString()
   name!: string;

   @IsBoolean()
   isAdmin: boolean = false;
}
