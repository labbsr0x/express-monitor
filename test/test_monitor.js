const chai = require('chai')
const chaiHttp = require('chai-http')
const Monitor = require('../lib/monitor')
const app = require('./app_test')

chai.use(chaiHttp)

const expect = chai.expect



chai.should()

describe('Collect metrics middleware', () => {	
	
	it('should collect metric from basic route', () => {
		chai.request(app)
			.get('/test')
			.set('Content-Type', 'application/json')
			.send()
			.end((err) => {
				if(err) console.log(err)
			})
		chai.request(app)
			.get('/metrics')
			.set('Content-Type', 'application/json')
			.send()
			.end((err, res) => {
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""}')
			})
	})

	it('should collect metric from express.Router', () => {
		chai.request(app)
			.get('/router/testRouter')
			.set('Content-Type', 'application/json')
			.send()
			.end((err) => {
				if(err) console.log(err)
			})
		chai.request(app)
			.get('/metrics')
			.set('Content-Type', 'application/json')
			.send()
			.end((err, res) => {
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="200",method="GET",addr="/router/testRouter",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="200",method="GET",addr="/router/testRouter",isError="false",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="200",method="GET",addr="/router/testRouter",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="200",method="GET",addr="/router/testRouter",isError="false",errorMessage=""}')
			})
	})

	it('should collect metric ignoring query string', () => {
		chai.request(app)
			.get('/test?param')
			.set('Content-Type', 'application/json')
			.send()
			.end((err) => {
				if(err) console.log(err)
			})
		chai.request(app)
			.get('/metrics')
			.set('Content-Type', 'application/json')
			.send()
			.end((err, res) => {
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""} 2')
				expect(res.text).to.include('request_seconds_sum{type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""} 2')
				expect(res.text).to.include('response_size_bytes{type="http",status="200",method="GET",addr="/test",isError="false",errorMessage=""}')
			})
	})
})