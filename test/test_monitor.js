const chai = require('chai')
const chaiHttp = require('chai-http')
const Monitor = require('../lib/monitor')
const express = require('express')
chai.use(chaiHttp)

const expect = chai.expect
const app = express()
chai.should()

describe('Collect metrics middleware', () => {
	let monitor
	
	beforeEach(() => {
		monitor = Monitor.init(app, true)
	})
	it('should collect metric from basic route', () => {
		chai.request(app)
			.get('/')
			.set('Content-Type', 'application/json')
			.send()
			.end((err) => {
				console.log(err)
			})
		chai.request(app)
			.get('/metrics')
			.set('Content-Type', 'application/json')
			.send()
			.end((err, res) => {
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="404",method="GET",addr="/",isError="true",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="404",method="GET",addr="/",isError="true",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="404",method="GET",addr="/",isError="true",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="404",method="GET",addr="/",isError="true",errorMessage=""}')
			})

	})
})