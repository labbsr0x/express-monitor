const express =  require('express')
const Monitor = require('../lib/monitor')

const app = express()

Monitor.init(app, true)

app.get('/test', (req, res) => {
	res.send('test')
})

const router = express.Router()

router.get('/testRouter', (req, res) => {
	res.send("hello")
})

app.use('/router', router)



module.exports = app