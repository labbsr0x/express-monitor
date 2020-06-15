const promclient = require("prom-client");

var isCollectingMetrics = false;
var dependencyRequestSeconds;

// a gauge to observe the dependency status
const dependencyUp = new promclient.Gauge({
    name: "dependency_up",
    help: "records if a dependency is up or down. 1 for up, 0 for down",
    labelNames: ["name"]
});

const applicationInfo = new promclient.Gauge({
    name: "application_info",
    help: "records static application info such as it's semantic version number",
    labelNames: ["version"]
});

/**
 * Get http response content length in bytes
 */
function getContentLength(res) {
    var resContentLength = "";
    if ("_contentLength" in res) {
        resContentLength = res['_contentLength'];
    } else {
        // Try header
        if (res.hasHeader('content-length')) {
            resContentLength = res.getHeader('content-length');
        }
    }
    return resContentLength;
}

/**
 * @callback IsErrorCallback a callback to check if the status code is an error
 * @param {string} status the response status code
 * @returns {boolean} indicates weather the status code is considered an error or not
 */

/**
 * The default isError callback for HTTP status codes. Any status 4xx and 5xx are considered errors. Other are considered success.
 * @param {string} status the HTTP status code
 */
function defaultIsErrorCallback(status) {
    return (/^([45].+$).*/.exec(status)) != null
}

/**
 * Get error message from the response. If error message is null, sets the string to empty. 
 * @param {HTTP response} res the http response
 * @returns a string with the error message or empty string if error message not found.
 */
function getErrorMessage(res){
    return res.get("Error-Message") ? res.get("Error-Message") : ""
}

/**
 * Ignore query string from URL
 * @param {string} url the URL to be filtered
 */
function filterUrl(url){
    return url.split("?")[0]
}

/**
 * Collect latency metric dependency_request_seconds 
 * @param {HTTP resquest} req the http request
 * @param {HTTP response} res the http response
 * @param {string} name the name of dependency
 * @param {string} type which request protocol was used (e.g. http, grpc, etc)
 */
function collectDependencyTime(req, res, name, type) {
    end = dependencyRequestSeconds.startTimer()
    var isErr = defaultIsErrorCallback(res.statusCode);
    var errorMsg = getErrorMessage(res);
    var url = filterUrl(req.url)

    // observes the dependency request duration
    res.once("finish", () => {
        end({
            "name": name,
            "type": type,
            "status": res.statusCode,
            "method": req.method,
            "addr": url,
            "isError": isErr,
            "errorMessage": errorMsg
        })
    })
}

/**
 * Initializes the middleware for HTTP requests
 * @param {Express} app the express app
 * @param {?boolean} shouldCollectDefaultMetrics indicates weather we should expose default node js metrics
 * @param {?number[]} buckets configures the histogram buckets. if null or empty, defaults to [0.1, 0.3, 1.5, 10.5]
 * @param {?String} version your apps version
 * @param {?IsErrorCallback} isErrorCallback a callback function that determines which StatusCode are errors and which are not. Defaults to consider 4xx and 5xx errors
 * @param {?String} metricsEndpoint the endpoint where the metrics will be exposed. Defaults to /metrics.
 * @returns a PromClient to allow the addition of your custom metrics
 */
function init(app, shouldCollectDefaultMetrics, buckets, version, isErrorCallback, metricsEndpoint) {
    if (!isCollectingMetrics && app) {
        if (typeof(isErrorCallback) !== "function") {
            isErrorCallback = defaultIsErrorCallback
        }

        if (!buckets || buckets.length === 0) {
            buckets = [0.1, 0.3, 1.5, 10.5]
        }

        // only inits once
        isCollectingMetrics = true;
        console.log("Init Prometheus monitoring");

        // a cumulative histogram to collect http request metrics in well-defined buckets of interest
        const reqSeconds = new promclient.Histogram({
            name: "request_seconds",
            help: "records in a histogram the number of http requests and their duration in seconds",
            buckets: buckets,
            labelNames: ["type", "status", "method", "addr", "isError", "errorMessage"]
        });

        // a counter to observe the response sizes
        const respSize = new promclient.Counter({
            name: "response_size_bytes",
            help: "counts the size of each http response",
            labelNames: ["type", "status", "method", "addr", "isError", "errorMessage"]
        });

        // a cumulative histogram to collect dependency request metrics in well-defined buckets of interest
        dependencyRequestSeconds = new promclient.Histogram({
            name: "dependency_request_seconds",
            help: "records in a histogram the number of requests of a dependency and their duration in seconds",
            buckets: buckets,
            labelNames: ["name", "type", "status", "method", "addr", "isError", "errorMessage"]
        })

        // middleware to capture prometheus metrics for the request
        app.all(/^(?!\/metrics$).*/, (req, res, next) => {
            let end = reqSeconds.startTimer()
            next();
            res.once("finish", () => {
                var isErr = isErrorCallback(res.statusCode);
                var errorMsg = getErrorMessage(res);
                var url = filterUrl(req.url);

                // observes the request duration
                end({
                    "type": "http",
                    "status": res.statusCode,
                    "method": req.method,
                    "addr": url,
                    "isError": isErr,
                    "errorMessage": errorMsg
                })

                // observes the request response size
                respSize.inc({
                    "type": "http",
                    "status": res.statusCode,
                    "method": req.method,
                    "addr": url,
                    "isError": isErr,
                    "errorMessage": errorMsg
                }, getContentLength(res))
            });
        })

        metricsEndpoint = (!metricsEndpoint) ? "/metrics" : metricsEndpoint; // endpoint to collect all the registered metrics
        app.get(metricsEndpoint, (req, res) => {
            res.status(200).header("Content-Type", "text/plain").send(promclient.register.metrics())
        });

        if (shouldCollectDefaultMetrics) {
            // Probe system metrics every 5th second.
            promclient.collectDefaultMetrics({timeout: 5000});
        }

        applicationInfo.set({"version": version}, 1);
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
        dependencyUp.set({"name": result.name}, (result.up ? 1 : 0));
    }
}

module.exports = {
    init, promclient, watchDependencies, collectDependencyTime
};
