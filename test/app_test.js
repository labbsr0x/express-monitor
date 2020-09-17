const express =  require('express')
const { Monitor } = require('../dist/')

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



module.exports = app