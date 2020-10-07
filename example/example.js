const express = require("express");
const promClient = require("prom-client");
const axios = require("axios");
const { Monitor } = require("../dist/")
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

app.get("/axios", async (req, res) => {
  const start = process.hrtime()
  const response = await axios.get('http://slowwly.robertomurray.co.uk/delay/1500/url/http://www.google.co.uk')
  Monitor.collectDependencyTime2("google", "axios", 400, "GET", "/a", true, "teste", start)
  
  res.json({"ok": true})
  //Monitor.collectDependencyTime(req, res, "Google", "http")
})

// launches the service
app.listen(3001,  () => {
    console.log("Started!")
})