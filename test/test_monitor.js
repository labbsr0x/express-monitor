const chai = require('chai')
const chaiHttp = require('chai-http')
const { Monitor } = require('../dist/')
const app = require('./app_test')
const axios = require('axios');

chai.use(chaiHttp)

const expect = chai.expect

chai.should()

describe('Collect metrics middleware', () => {

	it('should collect metric from basic route - GET', () => {
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

	it('should collect metric from basic route - POST', () => {
		chai.request(app)
			.post('/test')
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
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="200",method="POST",addr="/test",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="200",method="POST",addr="/test",isError="false",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="200",method="POST",addr="/test",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="200",method="POST",addr="/test",isError="false",errorMessage=""}')
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

	it('should collect metric with error message', () => {
		chai.request(app)
			.get('/testWithErrorMessage')
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
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="400",method="GET",addr="/testWithErrorMessage",isError="true",errorMessage="Test Error Message"} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="400",method="GET",addr="/testWithErrorMessage",isError="true",errorMessage="Test Error Message"}')
				expect(res.text).to.include('request_seconds_count{type="http",status="400",method="GET",addr="/testWithErrorMessage",isError="true",errorMessage="Test Error Message"} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="400",method="GET",addr="/testWithErrorMessage",isError="true",errorMessage="Test Error Message"}')
			})
	})

	it('should use the original registered path in addr label when registered with express.Router - success response', () => {
		chai.request(app)
			.get('/router/testPath/pathParameter')
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
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="200",method="GET",addr="/router/testPath/:parameter",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="200",method="GET",addr="/router/testPath/:parameter",isError="false",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="200",method="GET",addr="/router/testPath/:parameter",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="200",method="GET",addr="/router/testPath/:parameter",isError="false",errorMessage=""}')
			})
	})

	it('should use the original registered path in addr label when registered with express.Router - error response', () => {
		chai.request(app)
			.post('/router/testPath/pathParameter1/action/pathParameter2')
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
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="400",method="POST",addr="/router/testPath/:parameter1/action/:parameter2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="400",method="POST",addr="/router/testPath/:parameter1/action/:parameter2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"}')
				expect(res.text).to.include('request_seconds_count{type="http",status="400",method="POST",addr="/router/testPath/:parameter1/action/:parameter2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="400",method="POST",addr="/router/testPath/:parameter1/action/:parameter2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"}')
			})
	})

	it('should use the original registered path in addr label when registered with basic router - success response', () => {
		chai.request(app)
			.get('/testPathParameter/pathParameterValue')
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
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="200",method="GET",addr="/testPathParameter/:parameter",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="200",method="GET",addr="/testPathParameter/:parameter",isError="false",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="200",method="GET",addr="/testPathParameter/:parameter",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="200",method="GET",addr="/testPathParameter/:parameter",isError="false",errorMessage=""}')
			})
	})

	it('should use the original registered path in addr label when registered with basic router - error response', () => {
		chai.request(app)
			.post('/testPathParameter/pathParameter1/pathParameter2')
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
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="400",method="POST",addr="/testPathParameter/:param1/:param2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="400",method="POST",addr="/testPathParameter/:param1/:param2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"}')
				expect(res.text).to.include('request_seconds_count{type="http",status="400",method="POST",addr="/testPathParameter/:param1/:param2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="400",method="POST",addr="/testPathParameter/:param1/:param2",isError="true",errorMessage="Test Error Message: param1=pathParameter1 , param2=pathParameter2"}')
			})
	})

	it('should use the original requested URL in addr label and status 404 when there is no registered route for requested URL', async () => {
		chai.request(app)
			.post('/app/unregistered-path')
			.set('Content-Type', 'application/json')
			.send()
			.end((err) => {
        if(err) console.log(err)
			})
		await chai.request(app)
			.get('/metrics')
			.set('Content-Type', 'application/json')
			.send()
			.end((err, res) => {
        expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="404",method="POST",addr="/app/unregistered-path",isError="true",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="404",method="POST",addr="/app/unregistered-path",isError="true",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="404",method="POST",addr="/app/unregistered-path",isError="true",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="404",method="POST",addr="/app/unregistered-path",isError="true",errorMessage=""}')
			})
	})

	it('should use the original requested URL (without query string parameters) in addr label and status 404 when there is no registered route for requested URL', async () => {
		chai.request(app)
			.post('/unregistered-path-with-query-string?param=paramValue&name=Jhon&surname=Doe')
			.set('Content-Type', 'application/json')
			.send()
			.end((err) => {
				if(err) console.log(err)
			})
		await chai.request(app)
			.get('/metrics')
			.set('Content-Type', 'application/json')
			.send()
			.end((err, res) => {
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="404",method="POST",addr="/unregistered-path-with-query-string",isError="true",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="404",method="POST",addr="/unregistered-path-with-query-string",isError="true",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="404",method="POST",addr="/unregistered-path-with-query-string",isError="true",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="404",method="POST",addr="/unregistered-path-with-query-string",isError="true",errorMessage=""}')
			})
	})

  it('should collect depedency metric', async() => {
    const start = process.hrtime()
    const response = await axios.get('http://google.com/')
    const { method, path } = response.request
    Monitor.collectDependencyTime("Google", "axios", response.status, method, path, "", start)
    chai.request(app)
    .get('/metrics')
    .set('Content-Type', 'application/json')
    .send()
    .end((err, res) => {
      expect(res.text).to.include('dependency_request_seconds_bucket{le="0.1",name="Google",type="axios",status="200",method="GET",addr="/",isError="false",errorMessage=""}')
      expect(res.text).to.include('dependency_request_seconds_bucket{le="0.3",name="Google",type="axios",status="200",method="GET",addr="/",isError="false",errorMessage=""}')
      expect(res.text).to.include('dependency_request_seconds_bucket{le="1.5",name="Google",type="axios",status="200",method="GET",addr="/",isError="false",errorMessage=""}')
      expect(res.text).to.include('dependency_request_seconds_bucket{le="10.5",name="Google",type="axios",status="200",method="GET",addr="/",isError="false",errorMessage=""}')
      expect(res.text).to.include('dependency_request_seconds_bucket{le="+Inf",name="Google",type="axios",status="200",method="GET",addr="/",isError="false",errorMessage=""} 1')
      expect(res.text).to.include('dependency_request_seconds_sum{name="Google",type="axios",status="200",method="GET",addr="/",isError="false",errorMessage=""}')
      expect(res.text).to.include('dependency_request_seconds_count{name="Google",type="axios",status="200",method="GET",addr="/",isError="false",errorMessage=""} 1')
    })
  });

  it('should set isError to true when contains error message - collectDependencyTime', async() => {
    const start = process.hrtime()
    const errorMessage = "Foo error"
    Monitor.collectDependencyTime("dependencyNameTest", "fooType", 304, "GET", "/test", errorMessage, start)
    chai.request(app)
	  .get('/metrics')
	  .set('Content-Type', 'application/json')
	  .send()
	  .end((err, res) => {
      expect(res.text).to.include('dependency_request_seconds_bucket{le="0.1",name="dependencyNameTest",type="fooType",status="304",method="GET",addr="/test",isError="true",errorMessage="Foo error"}')
      expect(res.text).to.include('dependency_request_seconds_sum{name="dependencyNameTest",type="fooType",status="304",method="GET",addr="/test",isError="true",errorMessage="Foo error"}')
      expect(res.text).to.include('dependency_request_seconds_count{name="dependencyNameTest",type="fooType",status="304",method="GET",addr="/test",isError="true",errorMessage="Foo error"} 1')
    })
  })

  it('should collect non express request', async () => {
  	const start = process.hrtime();

  	const fakeInternalProcess = await new Promise(resolve => setTimeout(resolve, 50));
  	Monitor.collectRequestTime('amqp', 200, 'queue_to_test', start);

  	chai.request(app)
	  .get('/metrics')
	  .set('Content-Type', 'application/json')
	  .send()
	  .end((err, res) => {
		  expect(res.text).to.include('request_seconds_bucket{le="0.1",type="amqp",status="200",method="",addr="queue_to_test",isError="false",errorMessage=""} 1');
		  expect(res.text).to.include('request_seconds_sum{type="amqp",status="200",method="",addr="queue_to_test",isError="false",errorMessage=""}');
		  expect(res.text).to.include('request_seconds_count{type="amqp",status="200",method="",addr="queue_to_test",isError="false",errorMessage=""} 1');
	  })
  });

  it('should collect non express request with error', async () => {
  	const start = process.hrtime();

  	try{
  		await new Promise((_, reject) => setTimeout(() => reject('dummy error'), 30));
    }catch (err) {
      Monitor.collectRequestTime('amqp', 500, 'queue_to_test', start, err)
    }

  	chai.request(app)
	  .get('/metrics')
	  .set('Content-Type', 'application/json')
	  .send()
	  .end((err, res) => {
		  expect(res.text).to.include('request_seconds_bucket{le="0.1",type="amqp",status="500",method="",addr="queue_to_test",isError="true",errorMessage="dummy error"} 1');
		  expect(res.text).to.include('request_seconds_sum{type="amqp",status="500",method="",addr="queue_to_test",isError="true",errorMessage="dummy error"}');
		  expect(res.text).to.include('request_seconds_count{type="amqp",status="500",method="",addr="queue_to_test",isError="true",errorMessage="dummy error"} 1');
	  })
  })

  it('should collect swagger-express-middleware metrics', () => {
		chai.request(app)
			.get('/users/123')
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
				expect(res.text).to.include('request_seconds_bucket{le="0.1",type="http",status="200",method="GET",addr="/users/{userId}",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('request_seconds_sum{type="http",status="200",method="GET",addr="/users/{userId}",isError="false",errorMessage=""}')
				expect(res.text).to.include('request_seconds_count{type="http",status="200",method="GET",addr="/users/{userId}",isError="false",errorMessage=""} 1')
				expect(res.text).to.include('response_size_bytes{type="http",status="200",method="GET",addr="/users/{userId}",isError="false",errorMessage=""}')
      })
  })
});