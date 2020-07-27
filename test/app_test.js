const express =  require('express')
const Monitor = require('../lib/monitor')

const app = express()

Monitor.init(app, true)

app.get('/test', (req, res) => {
	res.send('test')
})

app.get('/testWithErrorMessage', (req, res) => {
	res.status(400)
	res.set("Error-Message", "Test Error Message")
	res.send("test error message")
})

const router = express.Router()

router.get('/testRouter', (req, res) => {
	res.send("test router")
})

app.use('/router', router)



module.exports = app