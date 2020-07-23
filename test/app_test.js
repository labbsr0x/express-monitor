const express =  require('express')
const Monitor = require('../lib/monitor')

const app = express()

Monitor.init(app, true)

app.get('/', (req, res) => {
	res.send('test')
})



module.exports = app