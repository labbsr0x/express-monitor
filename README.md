# express-monitor

A Prometheus middleware to add basic but very useful metrics for your Express JS app.

# Metrics

The only exposed metrics (for now) are the following:

```
http_requests_second{status, method, url, le}
http_requests_second_count{status, method, url}
http_requests_second_sum{status, method, url}
http_response_size_bytes{method, url}
dependency_up{name}
```

Where, for a specific request, `status` registers the response HTTP status, `method` registers the HTTP method and `url` registers the requested endpoint.

In detail:

1. The `http_requests_second` metric defines the histogram of how many requests are falling into the well defined buckets represented by the label `le`;

2. The `http_requests_second_count` is a counter that counts the overall number of requests with those exact label occurrences;

3. The `http_requests_second_sum` is a counter that counts the overall sum of how long the requests with those exact label occurrences are taking;

4. Finally, the `http_response_size_bytes` is a gauge that computes how much data is being sent back to the user for a given request.

# How To

Add this package as a dependency:

```
npm i -P @labbsr0x/express-monitor
```

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

Now run your app and point prometheus to the `/metrics` endpoint of your server.

More details on how Prometheus works, you can find it [here](https://medium.com/ibm-ix/white-box-your-metrics-now-895a9e9d34ec).


