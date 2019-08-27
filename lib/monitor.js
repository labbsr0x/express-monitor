const promclient = require("prom-client");

var isCollectingMetrics = false

function getContentLength(res) {
    var resContentLength = "";
    if ("_contentLength" in res){
        resContentLength = res['_contentLength'];
    }else{
        // Try header
        if(res.hasHeader('content-length')) {
            resContentLength = res.getHeader('content-length');
        }
    }
    return resContentLength;
}

/**
 * Initializes the middleware
 * @param {Express} app 
 * @param {boolean} shouldCollectDefaultMetrics 
 * @param {float[]} buckets [optional] configures the histogram buckets. if null or empty, defaults to [0.1, 0.3, 1.5, 10.5]
 * @returns a PromClient to allow the addition of your custom metrics
 */
function init(app, shouldCollectDefaultMetrics, buckets) {
    if (!isCollectingMetrics) { 
        if (!buckets || buckets.length == 0) {
            buckets = [0.1, 0.3, 1.5, 10.5]
        }
        // only inits once
        isCollectingMetrics = true;
        console.log("Init Prometheus monitoring");

        // a cumulative histogram to collect http request metrics in well-defined buckets of interest
        const hist = new promclient.Histogram({
            name: "http_requests_seconds",
            help: "records in a histogram the number of http requests and their duration in seconds",
            buckets: buckets,
            labelNames: [ "status", "method", "url", "responsesize" ]
        });

        // middleware to capture prometheus metrics for the request
        app.all(/^(?!\/metrics$).*/, (req, res, next) => {
            let end = hist.startTimer()
            next();
            res.once("finish", () => {
                end({"status": res.statusCode, "method": req.method, "url": req.url, "responsesize": getContentLength(res)})
            });
        })

        // endpoint to collect all the registered metrics
        app.get("/metrics", (req, res) => {
            res.status(200).header("Content-Type", "text/plain").send(promclient.register.metrics())
        });

        if (shouldCollectDefaultMetrics) {
            // Probe system metrics every 5th second.
            promclient.collectDefaultMetrics({ timeout: 5000 });
        }
    }

    return promclient;
}
var monitor = {
    "init": init
}
module.exports = monitor;