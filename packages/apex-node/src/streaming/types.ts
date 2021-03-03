/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export type StreamingEvent = {
  createdDate: string;
  replayId?: number;
  type: string;
};

export type TestResultMessage = {
  event: StreamingEvent;
  sobject: {
    Id: string;
  };
};

export type StreamMessage = {
  channel: string;
  clientId: string;
  successful?: boolean;
  id?: string;
  data?: TestResultMessage;
  error?: string;
};

export interface Event<T> {
  /**
   * A function that represents an event to which you subscribe by calling it with
   * a listener function as argument.
   *
   * @param listener The listener function will be called when the event happens.
   * @param thisArgs The `this`-argument which will be used when calling the event listener.
   * @param disposables An array to which a [disposable](#Disposable) will be added.
   * @return A disposable which unsubscribes the event listener.
   */
  (listener: (e: T) => unknown): unknown;
}

/**
 * A cancellation token is passed to an asynchronous or long running
 * operation to request cancellation, like cancelling a request
 * for completion items because the user continued to type.
 *
 * To get an instance of a `CancellationToken` use a
 * [CancellationTokenSource](#CancellationTokenSource).
 */
export interface CancellationToken {
  /**
   * Is `true` when the token has been cancelled, `false` otherwise.
   */
  isCancellationRequested: boolean;

  /**
   * An [event](#Event) which fires upon cancellation.
   */
  onCancellationRequested: Function;
}

/**
 * Defines a generalized way of reporting progress updates.
 */
export interface Progress<T> {
  /**
   * Report a progress update.
   * @param value A progress item, like a message and/or an
   * report on how much work finished
   */
  report(value: T): void;
}
