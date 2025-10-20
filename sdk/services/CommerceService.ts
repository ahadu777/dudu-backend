/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CommerceService {
    /**
     * Get product catalog
     * @returns any Product catalog
     * @throws ApiError
     */
    public static getCatalog(): CancelablePromise<{
        products?: Array<any>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/catalog',
        });
    }
    /**
     * Create new order
     * @param requestBody
     * @returns any Order created
     * @throws ApiError
     */
    public static postOrders(
        requestBody: Record<string, any>,
    ): CancelablePromise<{
        order_id?: number;
        status?: string;
        amounts?: {
            subtotal?: number;
            discount?: number;
            total?: number;
        };
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/orders',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Pay for order
     * @param id
     * @returns any Payment processed
     * @throws ApiError
     */
    public static postOrdersPay(
        id: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/orders/{id}/pay',
            path: {
                'id': id,
            },
        });
    }
}
