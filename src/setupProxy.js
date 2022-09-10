const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = app => {
    app.get('/info.json', (req, res) => {
        res.send({
            component: 'railmapgen.github.io',
            version: '9.9.9',
            environment: 'DEV',
            instance: 'localhost',
        });
    });

    app.use(
        ['/rmg', '/rmp', '/rmg-palette', '/rmg-components', '/rmg-templates', '/seed-project', '/rmg-translate'],
        createProxyMiddleware({
            target: 'https://uat-railmapgen.github.io',
            changeOrigin: true,
            secure: false,
            logLevel: 'debug',
        })
    );
};
