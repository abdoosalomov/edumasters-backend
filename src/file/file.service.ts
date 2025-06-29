import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FileService {
    private uploadDir = join(__dirname, '..', '..', 'uploads');

    constructor() {
        if (!existsSync(this.uploadDir)) {
            mkdirSync(this.uploadDir);
        }
    }

    getFileUrl(filename: string): string {
        return `/uploads/${filename}`;
    }

    getUploadDir(): string {
        return this.uploadDir;
    }
}
