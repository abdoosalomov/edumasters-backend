import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { hostname } from 'os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Public } from './auth/decorators/public.decorator';

const execAsync = promisify(exec);

@ApiTags('Health')
@Controller('health')
export class AppController {
    private readonly startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    private async getGitCommitId(): Promise<string> {
        try {
            const { stdout } = await execAsync('git rev-parse HEAD');
            return stdout.trim();
        } catch (error) {
            return 'unknown';
        }
    }

    private async getGitCommitMessage(): Promise<string> {
        try {
            const { stdout } = await execAsync('git log -1 --pretty=%B');
            return stdout.trim();
        } catch (error) {
            return 'unknown';
        }
    }

    private getMaskedEnvironmentVariables(): Record<string, string> {
        const maskedEnv: Record<string, string> = {};
        
        Object.keys(process.env).forEach(key => {
            const value = process.env[key];
            if (value) {
                // Mask all environment variables
                if (value.length <= 4) {
                    maskedEnv[key] = '***';
                } else {
                    maskedEnv[key] = `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
                }
            }
        });
        
        return maskedEnv;
    }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Health check endpoint (no authentication required)' })
    async healthCheck() {
        const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: `${uptimeSeconds}s`,
            host: hostname(),
            git: {
                commitId: await this.getGitCommitId(),
                commitMessage: await this.getGitCommitMessage(),
            },
            environment: this.getMaskedEnvironmentVariables(),
        };
    }
}
