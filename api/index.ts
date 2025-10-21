const { bootstrap } = require('../apps/api/dist/main');

let app;

module.exports = async (req, res) => {
  if (!app) {
    app = await bootstrap();
  }

  return app.getHttpAdapter().getInstance().handler(req, res);
};
