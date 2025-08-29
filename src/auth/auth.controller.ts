import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateTeacherDto, LoginDto } from './dto/teacher.dto';
import { CreateAdminDto } from './dto/admin.dto';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Get('check-username')
    @ApiOperation({ summary: 'Check if a username is already taken' })
    @ApiQuery({ name: 'username', type: String, required: true })
    @ApiQuery({ name: 'model', enum: ['teacher', 'admin'], required: true })
    async checkUsername(@Query('username') username: string, @Query('model') model: 'teacher' | 'admin') {
        const exists = await this.authService.checkUsername(username, model);
        return {
            username,
            model,
            exists,
        };
    }

    @Post('teacher/add')
    @ApiOperation({ summary: 'Add new teacher' })
    @ApiBody({ type: CreateTeacherDto })
    addTeacher(@Body() dto: CreateTeacherDto) {
        return this.authService.addTeacher(dto);
    }

    @Public()
    @Post('teacher/login')
    @ApiOperation({ summary: 'Login as teacher' })
    @ApiBody({ type: LoginDto })
    loginTeacher(@Body() dto: LoginDto) {
        return this.authService.loginTeacher(dto);
    }

    @Public()
    @Post('admin/register')
    @ApiOperation({ summary: 'Register a new admin' })
    @ApiBody({ type: CreateAdminDto })
    registerAdmin(@Body() dto: CreateAdminDto) {
        return this.authService.registerAdmin(dto);
    }

    @Public()
    @Post('admin/login')
    @ApiOperation({ summary: 'Login as admin' })
    @ApiBody({ type: LoginDto })
    loginAdmin(@Body() dto: LoginDto) {
        return this.authService.loginAdmin(dto);
    }
}
