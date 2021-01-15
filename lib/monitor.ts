import * as promclient from "prom-client";
import express from "express"

let isCollectingMetrics = false;
let dependencyRequestSeconds: promclient.Histogram;
let reqSeconds: promclient.Histogram;

export type Monitor = {
    init (app: express.Application, shouldCollectDefaultMetrics: boolean, buckets?: number[], version?: string, isErrorCallback?:isErrorCallback, metricsEndpoint?: string):void;
    promclient: typeof import("prom-client");
    watchDependencies(healthCheckCallback: HealthCheckCallback):void;
    watchDependenciesLoopOf(healthCheckCallback: HealthCheckCallback):void;
    collectDependencyTime(name: string, type: string, statusCode: number, method: string, addr: string, errorMessage: string, start: [number, number]):void;
    collectRequestTime(type: string, statusCode: number, addr: string, start: [number, number], errorMessage?: string): void;
    getAddress(request: express.Request):string;
};

export type HealthCheckResult =  {
    name: string;
    up: boolean;
};

export type isErrorCallback = (code:number|undefined) => boolean
export type HealthCheckCallback = (callback: HealthCheckResultCallBack) => void
export type HealthCheckResultCallBack = (result: HealthCheckResult) => void

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
function getContentLength(res: express.Response): number {
    let resContentLength = 0;
    if ("_contentLength" in res) {
        resContentLength = res['_contentLength'];
    } else {
        // Try header
        if (res.hasHeader('content-length')) {
            resContentLength = res.getHeader('content-length') as number;
        }
    }
    return resContentLength;
}

/**
 * Returns the diffence in seconds between a given start time and the current time
 * @param {[number,number]} start the start time of the dependecy request
 */
function diffTimeInSeconds(start: [number, number]) {
  const end = process.hrtime(start)
  const timeInSeconds = end[0] + (end[1] / 1000000000)
  return timeInSeconds
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
function defaultIsErrorCallback(status: number|undefined) {
    return (/^([45].+$).*/.exec(String(status))) != null
}

/**
 * Get error message from the response. If error message is null, sets the string to empty.
 * @param {HTTP response} res the http response
 * @returns a string with the error message or empty string if error message not found.
 */
function getErrorMessage(res: express.Response){
    return res.get("Error-Message") ? res.get("Error-Message") : ""
}

/**
 * Returns the original registered route path, if requested URL has not been registered, It returns the originalURL without query string parameters.
 * @param {HTTP request} req the http request
 * @returns {string address}
 */
function getAddress(req: any) : string {
    if (typeof req.baseUrl === "undefined") {
        return req.originalUrl.split("?")[0];
    }
    if (req.swagger) {
      return req.swagger.pathName
    }

    return req.baseUrl + (req.route && req.route.path ? req.route.path : "");
}

/**
 * Collect latency metric dependency_request_seconds
 * @param {string} name the name of dependency
 * @param {string} type which request protocol was used (e.g. http, grpc, etc)
 * @param {number} statusCode the status code returned by the dependency request
 * @param {string} method the method of the dependency request (e.g GET, POST, PATH, DELETE)
 * @param {string} addr the path of the dependency request
 * @param {string} errormessage the error message of the dependency request
 * @param {[number,number]} start the start time of the dependecy request
 */
function collectDependencyTime(name: string, type: string, statusCode: number, method: string, addr: string, errorMessage: string, start: [number, number]){
    const elapsedSeconds = diffTimeInSeconds(start)
    dependencyRequestSeconds.labels(name, type, String(statusCode), method, addr, String(!!errorMessage), errorMessage || '').observe(elapsedSeconds)
}

/**
 * Manual latency collect metric request_seconds
 * @param {string} type which request protocol was used (e.g. http, grpc, amqp, etc)
 * @param {number} statusCode the status code returned by the dependency request
 * @param {string} addr the path of the dependency request
 * @param {[number,number]} start the start time of the dependecy request
 * @param {string} errorMessage the error message of the dependency request
 */
function collectRequestTime(type: string, statusCode: number, addr: string, start: [number, number], errorMessage: string){
    const elapsedSeconds = diffTimeInSeconds(start);
    reqSeconds.labels(type, String(statusCode), '', addr, String(!!errorMessage), errorMessage || '').observe(elapsedSeconds)
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
function init(app: express.Application, shouldCollectDefaultMetrics?: boolean, buckets?: number[], version?: string, isErrorCallback?: isErrorCallback, metricsEndpoint?: string) {
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
        reqSeconds = new promclient.Histogram({
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
        app.all(/^(?!\/metrics$).*/, (req: express.Request, res: express.Response, next: express.NextFunction) => {
            let end = reqSeconds.startTimer()
            next();
            res.once("finish", () => {
                const isErr = typeof isErrorCallback === "function" ? isErrorCallback(res.statusCode) : false;
                const errorMsg = getErrorMessage(res);
                const address = getAddress(req)

                // observes the request duration
                end({
                    "type": "http",
                    "status": res.statusCode,
                    "method": req.method,
                    "addr": address,
                    "isError": String(isErr),
                    "errorMessage": errorMsg
                })

                // observes the request response size
                respSize.inc({
                    "type": "http",
                    "status": res.statusCode,
                    "method": req.method,
                    "addr": address,
                    "isError": String(isErr),
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
        if(version){
            applicationInfo.set({"version": version}, 1);
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
function watchDependencies(healthCheck: HealthCheckCallback) {
    if (typeof healthCheck === 'function') {

        setInterval(() => {
            healthCheck(registerDependencyMetrics);
        }, 15000);

    } else {
        console.log("[Express Monitor][Watch Dependencies]: healthCheck callback needs to be a valid function")
    }
}

/**
 * Inits a routine to register the health of the app's dependencies.
 * Needs to return a valid array of HealthCheckResult.
 * @param {HealthCheckCallback} healthCheck
 */
function watchDependenciesLoopOf(healthCheck: HealthCheckCallback) {
    if (typeof healthCheck === 'function') {
        healthCheck(registerDependencyMetrics)
    } else {
        console.log("[Express Monitor][Watch Dependencies Loop Of]: healthCheck callback needs to be a valid function")
    }
}

/**
 * Registers the current metrics for a specific dependency
 * @param {HealthCheckResult} result  the result of health checking a specific dependency
 */
function registerDependencyMetrics(result: HealthCheckResult): void {
    if (result) {
        dependencyUp.set({"name": result.name}, (result.up ? 1 : 0));
    }
}
 const m: Monitor = {
    init,
    promclient,
    watchDependencies,
    watchDependenciesLoopOf,
    collectDependencyTime,
    collectRequestTime,
    getAddress
 };

export default m


