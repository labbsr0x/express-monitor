# express-monitor
A Prometheus middleware to add basic but very useful metrics for your Express JS app.

# How To

Add this package as a dependency:

```
npm i -P github.com/labbsr0x/express-monitor
```

Use it as a middleware:

```
const express = require("express")
const { Monitor } = require("labbsr0x/express-monitor");

const app = express();
Monitor.init(app, true); // the 'true' argument exposes default NodeJS metrics as well
```

Now run your app and point prometheus to the `/metrics` endpoint of your server.

More details on how Prometheus works, you can find it [here](https://medium.com/ibm-ix/white-box-your-metrics-now-895a9e9d34ec).


