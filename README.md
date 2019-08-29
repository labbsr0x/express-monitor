# express-monitor

A Prometheus middleware to add basic but very useful metrics for your Express JS app.

# Metrics

The only exposed metrics (for now) are the following:

```
http_requests_second{status, method, url, le}
http_requests_second_count{status, method, url}
http_requests_second_sum{status, method, url}
http_response_size_bytes{status, method, url}
dependency_up{name}
```

Where, for a specific request, `status` registers the response HTTP status, `method` registers the HTTP method and `url` registers the requested endpoint.

In detail:

1. The `http_requests_second` metric defines the histogram of how many requests are falling into the well defined buckets represented by the label `le`;

2. The `http_requests_second_count` is a counter that counts the overall number of requests with those exact label occurrences;

3. The `http_requests_second_sum` is a counter that counts the overall sum of how long the requests with those exact label occurrences are taking;

4. The `http_response_size_bytes` is a counter that computes how much data is being sent back to the user for a given request type. It captures the response size from the `content-length` response header. If there is no such header, the value exposed as metric will be zero;

5. Finally, the `dependecy_up` is a metric to register weather a specific dependency is up (1) or down (0). The label `name` registers the dependency name;

# How to

Add this package as a dependency:

```
npm i -P @labbsr0x/express-monitor
```

## HTTP Metrics

Use it as middleware:

```js
const express = require("express");
const { Monitor } = require("@labbsr0x/express-monitor");

const app = express();
const promclient = Monitor.init(app, true); // the 'true' argument exposes default NodeJS metrics as well; the promclient allows you to add custom metrics to the same prometheus registry
```

One can optionally define the buckets of observation for the `http_requests_second` histogram by doing:

```js
...
const promclient = Monitor.init(app, true, [0.1]); // where only one bucket (of 100ms) will be given as output in the /metrics endpoint
```

**Important**: This middleware requires to be put first in the middleware chain, so it can capture metrics from all possible requests.

## Dependency Metrics

Just provide a health check callback to be `watchDependencies` function:

```js
const { Monitor } = require("@labbsr0x/express-monitor");

// A RegisterDepedencyMetricsCallback will be automatically injected into the HealthCheckCallback
Monitor.watchDependencies((register) => {
    // here you implement the logic to go after your dependencies and check their health
    // the return must be an array of HealthCheckResult{name, status}
    register({ name: "Fake dependency 1", up: true});
    register({ name: "Fake dependency 2", up: false});
});
```

Now run your app and point prometheus to the `/metrics` endpoint of your server.

More details on how Prometheus works, you can find it [here](https://medium.com/ibm-ix/white-box-your-metrics-now-895a9e9d34ec).

# Example

In the `example` folder, you'll find a very simple but useful example to get you started. On your terminal, navigate to the folder and type:

```
npm i
```

and then

```
npm start
```

On your browser, go to `localhost:3000` and then go to `localhost:3000/metrics` to see the exposed metrics.


