const express =  require('express')
const { Monitor } = require('../dist/')
const bodyParser = require('body-parser');
const path = require('path');
const createMiddleware = require('swagger-express-middleware');

const app = express()

Monitor.init(app, true)

app.get('/test', (req, res) => {
	res.status(200)
	res.send('test')
})

app.get('/testWithErrorMessage', (req, res) => {
	res.status(400)
	res.set("Error-Message", "Test Error Message")
	res.send("test error message")
})

app.post('/test', (req, res) => {
	res.status(200)
	res.send('test post')
})

app.get('/testPathParameter/:parameter', (req, res) => {
	res.status(200)
	res.send('test post')
})
app.post('/testPathParameter/:param1/:param2', (req, res) => {
	res.status(400)
	res.set("Error-Message", `Test Error Message: param1=${req.params.param1} , param2=${req.params.param2}`)
	res.send()
})

const router = express.Router()

router.get('/testRouter', (req, res) => {
	res.send("test router")
})

router.get('/testPath/:parameter', (req, res) => {
	res.send("parameter " + req.params.parameter);
})

router.post('/testPath/:parameter1/action/:parameter2', (req, res) => {
	res.status(400)
	res.set("Error-Message", `Test Error Message: param1=${req.params.parameter1} , param2=${req.params.parameter2}`)
	res.send("test 2 path parameters")
})

app.use('/router', router)


const swaggerFile = path.join(__dirname, 'swagger/api/swagger-config.yml');
createMiddleware(swaggerFile, app, (error, middleware) => {
  if (error) {
    console.error('Error on Swagger Express', error);
  }
  app.use(
    middleware.metadata(),
    middleware.CORS(),
    middleware.files(),
    middleware.parseRequest(),
    middleware.validateRequest()
  );
  app.use(bodyParser.text());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    const controllerName = req.swagger.path['x-swagger-router-controller'];
    const operationId = req.swagger.operation['operationId'];
    console.log(`Run ${controllerName}[${operationId}]`);

    const controller = require(`./swagger/api/${controllerName}`);
    controller[operationId](req, res);

    next();
  });
  console.log('Swagger Express done');
});

module.exports = app