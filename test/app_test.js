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

const router = express.Router()

router.get('/testRouter', (req, res) => {
	res.send("test router")
})

app.use('/router', router)



module.exports = app