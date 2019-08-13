const promclient = require("prom-client");

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

var isCollectingMetrics = false
var monitor = {
    "init": (app, shouldCollectDefaultMetrics) => {
        if (!isCollectingMetrics) {
            console.log("Init Prometheus monitoring");
            // a cumulative histogram to collect http request metrics in well-defined buckets of interest
            const hist = new promclient.Histogram({
                name: "requests_seconds",
                help: "measure the number of requests processed and its duration in seconds separated by well-defined buckets of interest",
                buckets: [0.1, 0.3, 1, 3, 7],
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
    }
}
module.exports = monitor;