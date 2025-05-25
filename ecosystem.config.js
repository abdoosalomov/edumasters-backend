module.exports = {
    apps: [
        {
            name: 'edumasters',
            script: 'dist/src/main.js',
            instances: 1, // or 'max' for cluster mode
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
