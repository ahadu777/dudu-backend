/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InfraService {
    /**
     * Liveness probe
     * @returns any OK
     * @throws ApiError
     */
    public static getHealthz(): CancelablePromise<{
        status?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/healthz',
        });
    }
    /**
     * Service name and version
     * @returns any OK
     * @throws ApiError
     */
    public static getVersion(): CancelablePromise<{
        name?: string;
        version?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/version',
        });
    }
}
