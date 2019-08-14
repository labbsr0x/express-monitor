# express-monitor
A Prometheus middleware to add basic but very useful metrics for your Express JS app.

# How To

Add this package as a dependency:

```
npm i -P @labbsr0x/express-monitor
```

Use it as middleware:

```
const express = require("express");
const { Monitor } = require("@labbsr0x/express-monitor");

const app = express();
const promclient = Monitor.init(app, true); // the 'true' argument exposes default NodeJS metrics as well; the promclient allows you to add custom metrics to the same prometheus registry
```

**Important**: This middleware requires to be put first in the middleware chain, so it can capture metrics from all possible requests.

Now run your app and point prometheus to the `/metrics` endpoint of your server.

More details on how Prometheus works, you can find it [here](https://medium.com/ibm-ix/white-box-your-metrics-now-895a9e9d34ec).


