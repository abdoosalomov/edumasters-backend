import { Controller, Post, UploadedFile, UseInterceptors, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { FileService } from './file.service';
import { extname } from 'path';
import { Response } from 'express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';

@ApiTags('Files')
@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) {}

    @Post('upload')
    @ApiOperation({ summary: 'Upload a file (any type)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: 'uploads/',
                filename: (_req, file, cb) => {
                    const ext = extname(file.originalname); // e.g. .jpg
                    const shortId = randomBytes(3).toString('hex'); // 6 chars
                    const timestamp = Date.now();
                    const uniqueName = `${shortId}_${timestamp}${ext}`;
                    cb(null, uniqueName);
                },
            }),
        }),
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        return {
            originalName: file.originalname,
            filename: file.filename,
            url: this.fileService.getFileUrl(file.filename),
        };
    }

    @Get(':filename')
    @ApiOperation({ summary: 'Serve a file by filename' })
    async getFile(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = this.fileService.getUploadDir() + '/' + filename;
        try {
            res.sendFile(filePath);
        } catch {
            throw new NotFoundException('File not found');
        }
    }
}
