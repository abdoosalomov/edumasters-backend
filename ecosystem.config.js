module.exports = {
    apps: [
        {
            name: 'edumasters',
            script: 'dist/main.js',
            instances: 1, // or 'max' for cluster mode
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            
            // Log rotation configuration
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            
            // Log rotation settings
            max_size: '20M',        // Max size per log file (20MB)
            max_files: '30',        // Keep 30 log files (about 1 month if rotating daily)
            merge_logs: true,       // Merge stdout and stderr logs
            
            env: {
                NODE_ENV: 'production',
                PORT: 6068,
            },
            env_ssl: {
                NODE_ENV: 'production',
                PORT: 6069,
                ENABLE_SSL: 'true',
                SSL_KEY_PATH: './ssl/certs/server.key',
                SSL_CERT_PATH: './ssl/certs/server.crt',
            },
        },
    ],
};
