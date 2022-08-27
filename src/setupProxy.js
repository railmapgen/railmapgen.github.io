const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = app => {
    app.use(
        ['/rmg', '/rmg-palette', '/rmg-components', '/rmg-templates', '/seed-project'],
        createProxyMiddleware({
            target: 'https://uat-railmapgen.github.io',
            changeOrigin: true,
            secure: false,
            logLevel: 'debug',
        })
    );
};
