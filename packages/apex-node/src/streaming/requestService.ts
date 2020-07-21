/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DEFAULT_CONNECTION_TIMEOUT_MS,
  ENV_SFDX_DEFAULTUSERNAME,
  ENV_SFDX_INSTANCE_URL
} from './constants';

export class RequestService {
  private _instanceUrl!: string;
  private _accessToken!: string;
  private _proxyUrl!: string;
  private _proxyStrictSSL: boolean = false;
  private _proxyAuthorization!: string;
  private _connectionTimeoutMs: number = DEFAULT_CONNECTION_TIMEOUT_MS;

  public getEnvVars(): any {
    const envVars = Object.assign({}, process.env);
    const proxyUrl = this.proxyUrl;
    if (proxyUrl) {
      envVars['HTTP_PROXY'] = proxyUrl;
      envVars['HTTPS_PROXY'] = proxyUrl;
    }
    const instanceUrl = this.instanceUrl;
    if (instanceUrl) {
      envVars[ENV_SFDX_INSTANCE_URL] = instanceUrl;
    }
    const sid = this.accessToken;
    if (sid) {
      envVars[ENV_SFDX_DEFAULTUSERNAME] = sid;
    }
    return envVars;
  }

  public get instanceUrl(): string {
    return this._instanceUrl;
  }

  public set instanceUrl(instanceUrl: string) {
    this._instanceUrl = instanceUrl;
  }

  public get accessToken(): string {
    return this._accessToken;
  }

  public set accessToken(accessToken: string) {
    this._accessToken = accessToken;
  }

  public get proxyUrl(): string {
    return this._proxyUrl;
  }

  public set proxyUrl(proxyUrl: string) {
    this._proxyUrl = proxyUrl;
  }

  public get proxyStrictSSL(): boolean {
    return this._proxyStrictSSL;
  }

  public set proxyStrictSSL(proxyStrictSSL: boolean) {
    this._proxyStrictSSL = proxyStrictSSL;
  }

  public get proxyAuthorization(): string {
    return this._proxyAuthorization;
  }

  public set proxyAuthorization(proxyAuthorization: string) {
    this._proxyAuthorization = proxyAuthorization;
  }

  public get connectionTimeoutMs(): number {
    return this._connectionTimeoutMs || DEFAULT_CONNECTION_TIMEOUT_MS;
  }

  public set connectionTimeoutMs(connectionTimeoutMs: number) {
    this._connectionTimeoutMs = connectionTimeoutMs;
  }
}
