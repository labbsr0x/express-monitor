# express-monitor

A Prometheus middleware to add basic but very useful metrics for your Express JS app.

# Metrics

The only exposed metrics (for now) are the following:

```
request_seconds_bucket{type, status, isError, errorMessage, method, addr, le}
request_seconds_count{type, status, isError, errorMessage, method, addr}
request_seconds_sum{type, status, isError, errorMessage, method, addr}
response_size_bytes{type, status, isError, errorMessage, method, addr}
dependency_up{name}
dependency_request_seconds_bucket{name, type, status, isError, errorMessage, method, addr, le}
dependency_request_seconds_count{name, type, status, isError, errorMessage, method, add}
dependency_request_seconds_sum{name, type, status, isError, errorMessage, method, add}
application_info{version}
```

Where, for a specific request, `type` tells which request protocol was used (`grpc`, `http`, etc), `status` registers the response status, `method` registers the request method, `addr` registers the requested endpoint address, `version` tells which version of your app handled the request, `isError` lets us know if the status code reported is an error or not, and `name` register the name of the dependency.

In detail:

1. `request_seconds_bucket` is a metric defines the histogram of how many requests are falling into the well defined buckets represented by the label `le`;

2. `request_seconds_count` is a counter that counts the overall number of requests with those exact label occurrences;

3. `request_seconds_sum` is a counter that counts the overall sum of how long the requests with those exact label occurrences are taking;

4. `response_size_bytes` is a counter that computes how much data is being sent back to the user for a given request type. It captures the response size from the `content-length` response header. If there is no such header, the value exposed as metric will be zero;

5. `dependency_up` is a metric to register weather a specific dependency is up (1) or down (0). The label `name` registers the dependency name;

6. The `dependency_request_seconds_bucket` is a metric that defines the histogram of how many requests to a specific dependency are falling into the well defined buckets represented by the label le;

7. The `dependency_request_seconds_count` is a counter that counts the overall number of requests to a specific dependency;

8. The `dependency_request_seconds_sum` is a counter that counts the overall sum of how long requests to a specific dependency are taking;

9. Finally, `application_info` holds static info of an application, such as it's semantic version number;

# How to

Add this package as a dependency:

```
npm i -P @labbsr0x/express-monitor@2.3.0
```

## HTTP Metrics

Use it as middleware:

```js
const express = require("express");
const { Monitor } = require("@labbsr0x/express-monitor");

const app = express();
Monitor.init(app, true); // the 'true' argument exposes default NodeJS metrics as well
```

One can optionally define the buckets of observation for the `request_second` histogram by doing:

```js
...
Monitor.init(app, true, [0.1]); // where only one bucket (of 100ms) will be given as output in the /metrics endpoint
```

Other optional parameters are also:
1. `version`: a semantic version string identifying the version of your application. Empty by default.
2. `isErrorCallback`: an error callback to define what **you** consider as error. `4**` and `5**` considered as errors by default;
3. `metricsEndpoint`: the endpoint where the metrics will be exposed. `/metrics` by default.

`Monitor` also comes with a `promclient` so you can expose your custom prometheus metrics:

```js
// below we define a Gauge metric
var myGauge = new Monitor.promclient.Gauge({
    name: "my_gauge",
    help: "records my custom gauge metric",
    labelNames: [ "example_label" ]
});

...

// and here we add a metric event that will be automatically exposed to /metrics endpoint
myGauge.set({"example_label":"value"}, 220);
```

It is possible to capture error messages that were saved using `res.set("Error-Message", "foo message")`. For example:

```js
res.set("Error-Message", "User not found");
```

**Important**: This middleware requires to be put first in the middleware execution chain, so it can capture metrics from all possible requests.

## Dependency Metrics

For you to know when a dependency is up or down, just provide a health check callback to be `watchDependencies` function:

```js
const express = require("express");
const { Monitor } = require("@labbsr0x/express-monitor");

const app = express();
Monitor.init(app, true);

// A RegisterDepedencyMetricsCallback will be automatically injected into the HealthCheckCallback
Monitor.watchDependencies((register) => {
    // here you implement the logic to go after your dependencies and check their health
    register({ name: "Fake dependency 1", up: true});
    register({ name: "Fake dependency 2", up: false});
});
```

Now run your app and point prometheus to the defined metrics endpoint of your server.

You also can monitor a dependency event. Just call collectDependencyTime and pass the right params.

```js
Monitor.collectDependencyTime(req, res, name, type)
```

More details on how Prometheus works, you can find it [here](https://medium.com/@abilio.esteves/white-box-your-metrics-now-895a9e9d34ec).

# Example

In the `example` folder, you'll find a very simple but useful example to get you started. On your terminal, navigate to the project's root folder and type:

```bash
npm i && cd example && npm i
```

and then

```bash
npm start
```

On your browser, go to `localhost:3000` and then go to `localhost:3000/example/metrics` to see the exposed metrics.

# Big Brother

This is part of a more large application called [Big Brother](https://github.com/labbsr0x/big-brother).


