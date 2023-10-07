import { AxiosError } from "axios";

export const errorCollection = "errors";

export class SheetProcessError extends Error {
  thrownError: any;
  constructor(msg: string, thrownError: any) {
    super(msg);
    this.thrownError = thrownError;

    Object.setPrototypeOf(this, SheetProcessError.prototype);
  }
}

export class MessageSendError extends Error {
  axiosError: AxiosError | null;

  constructor(msg: string, axiosError: AxiosError | null = null) {
    super(msg);
    this.axiosError = axiosError;

    Object.setPrototypeOf(this, MessageSendError.prototype);
  }
}
