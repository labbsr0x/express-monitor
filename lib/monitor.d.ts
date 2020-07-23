/// <reference types="express" />
/// <reference types="prom-client" />
import express from "express"

export type HealthCheckResult =  {
    name: string;
    up: boolean;
};

export type isErrorCallback = (code:number) => boolean
export type HealthCheckCallback = (result: HealthCheckResult) => void

export declare type Monitor = {
    init (app: express.Application, shouldCollectDefaultMetrics: boolean, buckets?: number[], version?: string, isErrorCallback?:isErrorCallback, metricsEndpoint?: string):void
    promclient: typeof import("prom-client"),
    watchDependencies(healthCheckCallback: HealthCheckCallback):void,
    collectDependencyTime: (request: express.Request, response: express.Response, name: string, type: "http" | "grpc" | "string")
};

