/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TicketsService {
    /**
     * Get user's tickets
     * @returns any User tickets
     * @throws ApiError
     */
    public static getMyTickets(): CancelablePromise<{
        tickets?: Array<any>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/my/tickets',
        });
    }
}
