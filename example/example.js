const express = require("express");
const promClient = require("prom-client");
const Monitor = require('../lib/monitor')
const app = express();

// inits the monitor with the express middleware to intercept the requests and register http metrics
Monitor.init(app, true, [0.1, 1], "v1.0.0", (status) => {
    return (/^([345].+$).*/.exec(status)) != null // 3xx will also be considered as error
}, "/example/metrics");

// inits a routine to expose health metrics
Monitor.watchDependencies((register) => {
    register({ name: "Fake dependency 1", up: true});
    register({ name: "Fake dependency 2", up: false});
});

// defines a custom metric
var myGauge = new Monitor.promclient.Gauge({
    name: "my_gauge",
    help: "records my custom gauge metric",
    labelNames: [ "example_label" ]
});

// exposes an test api
app.get("/", (req, res, next) => {
    myGauge.set({"example_label":"value"}, Math.random(100));
    res.set("Error-Message", "304 - Not Modified");
    res.json({"ok": true});
    Monitor.collectDependencyTime(req, res, "dependencyNameTest", "fooType")
})

// launches the service
app.listen(3000,  () => {
    console.log("Started!")
})