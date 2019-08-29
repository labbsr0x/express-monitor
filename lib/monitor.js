const promclient = require("prom-client");

var isCollectingMetrics = false;

// a gauge to observe the dependency status
const dependencyUp = new promclient.Gauge({
    name: "dependency_up",
    help: "records if a dependency is up or down. 1 for up, 0 for down",
    labelNames: [ "name" ]
});

/**
 * Get http response content length in bytes
 */
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
 * @param {Express} app the express app
 * @param {boolean} shouldCollectDefaultMetrics indicates weather we should expose default node js metrics
 * @param {?number[]} buckets configures the histogram buckets. if null or empty, defaults to [0.1, 0.3, 1.5, 10.5]
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
        const reqSeconds = new promclient.Histogram({
            name: "http_requests_seconds",
            help: "records in a histogram the number of http requests and their duration in seconds",
            buckets: buckets,
            labelNames: [ "status", "method", "url" ]
        });

        // a counter to observe the response sizes
        const respSize = new promclient.Counter({
            name: "http_response_size_bytes",
            help: "counts the size of each http response",
            labelNames: [ "status", "method", "url" ]
        });

        // middleware to capture prometheus metrics for the request
        app.all(/^(?!\/metrics$).*/, (req, res, next) => {
            let end = reqSeconds.startTimer()
            next();
            res.once("finish", () => {
                end({"status": res.statusCode, "method": req.method, "url": req.url}) // observes the request duration
                respSize.inc({"status": res.statusCode, "method": req.method, "url": req.url}, getContentLength(res)) // observes the request response size
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

/**
 * @typedef {Object} HealthCheckResult structure to hold the health check result. Has a name (string) and an up (boolean) property
 * @property {string} name the name of the dependency
 * @property {boolean} up the status of the dependency. true for up, false for down
 */

 /**
  * @callback RegisterDependencyMetricsCallback a callback to register the metrics for a specific dependency
  * @param {HealthCheckResult} result the result of health checking a specific dependency
  */

/**
 * @callback HealthCheckCallback a callback to check the health of the apps dependencies
 * @param {RegisterDependencyMetricsCallback} register a callback to register the metrics for a specific dependency
 * @returns {HealthCheckResult[]} an array of health check results, one for each dependency
 */

/**
 * Inits a routine to periodically watch the health of the app's dependencies. 
 * Needs to return a valid array of HealthCheckResult.
 * @param {HealthCheckCallback} healthCheck 
 */
function watchDependencies(healthCheck) {
    if (typeof healthCheck === 'function') {

        timer = setInterval(() => {
            healthCheck(registerDependencyMetrics);
        }, 15000);

    } else {
        console.log("[Express Monitor][Watch Dependencies]: healthCheck callback needs to be a valid function")
    }
}

/**
 * Registers the current metrics for a specific dependency
 * @param {HealthCheckResult} result  the result of health checking a specific dependency
 */
function registerDependencyMetrics(result) {
    if (result) {
        dependencyUp.set({"name":result.name}, (result.up ? 1 : 0));
    }
}

var monitor = {
    "init": init,
    "promclient": promclient,
    "watchDependencies": watchDependencies
}
module.exports = monitor;