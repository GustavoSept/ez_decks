import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
   constructor(private readonly userService: UserService) {}

   @Post()
   create(@Body() createUserDto: CreateUserDto) {
      const { name, email, isAdmin } = createUserDto;
      return this.userService.create({
         name,
         email,
         isAdmin,
      });
   }

   @Get()
   findAll() {
      return this.userService.findMany({});
   }

   @Get(':id')
   findOne(@Param('id') id: string) {
      return this.userService.findOne({ id: Number(id) });
   }

   // @Patch(':id')
   // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
   //    return this.userService.update(+id, updateUserDto);
   // }

   // @Delete(':id')
   // remove(@Param('id') id: string) {
   //    return this.userService.remove(+id);
   // }
}
